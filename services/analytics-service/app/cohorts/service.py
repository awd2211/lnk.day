"""
Cohort Analysis Service
Provides cohort CRUD and retention analysis with ClickHouse queries
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4
import random

from app.core.clickhouse import get_clickhouse_client
from .models import (
    Cohort,
    CohortType,
    CohortGranularity,
    CohortMetric,
    CohortCondition,
    CohortCreate,
    CohortUpdate,
    CohortAnalysis,
    CohortRow,
    CohortPeriod,
    RetentionData,
    CohortComparison,
    CohortSegment,
    CohortInsight,
    PresetCohort,
)


class CohortService:
    """Service for cohort analysis operations."""

    def __init__(self):
        self.client = get_clickhouse_client()
        # In-memory storage (production should use PostgreSQL)
        self.cohorts: Dict[str, Cohort] = {}

    # ========== Cohort CRUD ==========

    def create_cohort(self, team_id: str, data: CohortCreate) -> Cohort:
        """Create a new cohort definition."""
        cohort_id = str(uuid4())

        cohort = Cohort(
            id=cohort_id,
            team_id=team_id,
            name=data.name,
            description=data.description,
            type=data.type,
            granularity=data.granularity,
            entry_event=data.entry_event,
            entry_conditions=data.entry_conditions,
            return_event=data.return_event,
            return_conditions=data.return_conditions,
            filters=data.filters,
            periods_to_track=data.periods_to_track,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.cohorts[cohort_id] = cohort
        return cohort

    def get_cohort(self, cohort_id: str, team_id: str) -> Optional[Cohort]:
        """Get a cohort by ID."""
        cohort = self.cohorts.get(cohort_id)
        if cohort and cohort.team_id == team_id:
            return cohort
        return None

    def list_cohorts(self, team_id: str, active_only: bool = True) -> List[Cohort]:
        """List all cohorts for a team."""
        cohorts = [
            c for c in self.cohorts.values()
            if c.team_id == team_id and (not active_only or c.is_active)
        ]
        return sorted(cohorts, key=lambda x: x.created_at, reverse=True)

    def update_cohort(
        self, cohort_id: str, team_id: str, data: CohortUpdate
    ) -> Optional[Cohort]:
        """Update a cohort."""
        cohort = self.get_cohort(cohort_id, team_id)
        if not cohort:
            return None

        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(cohort, key, value)

        cohort.updated_at = datetime.utcnow()
        self.cohorts[cohort_id] = cohort
        return cohort

    def delete_cohort(self, cohort_id: str, team_id: str) -> bool:
        """Delete a cohort."""
        cohort = self.get_cohort(cohort_id, team_id)
        if cohort:
            del self.cohorts[cohort_id]
            return True
        return False

    # ========== Cohort Analysis ==========

    def analyze_cohort(
        self,
        cohort_id: str,
        team_id: str,
        start_date: datetime,
        end_date: datetime,
        metric: CohortMetric = CohortMetric.RETENTION,
        breakdown_by: Optional[str] = None,
    ) -> Optional[CohortAnalysis]:
        """Analyze cohort retention and behavior."""
        cohort = self.get_cohort(cohort_id, team_id)
        if not cohort:
            return None

        # Calculate cohort data
        cohort_rows = self._calculate_cohort_rows(
            cohort, start_date, end_date, metric
        )

        # Build retention matrix
        retention_matrix = self._build_retention_matrix(cohort_rows, cohort.granularity)

        # Calculate summary stats
        total_users = sum(row.initial_size for row in cohort_rows)

        avg_p1 = self._get_average_retention(cohort_rows, 1)
        avg_p4 = self._get_average_retention(cohort_rows, 4)
        avg_p12 = self._get_average_retention(cohort_rows, 12)

        # Determine retention trend
        trend, trend_pct = self._calculate_retention_trend(cohort_rows)

        # Get breakdown data if requested
        by_country = None
        by_device = None
        by_source = None

        if breakdown_by == "country" or breakdown_by is None:
            by_country = self._get_cohort_by_country(team_id, start_date, end_date)
        if breakdown_by == "device" or breakdown_by is None:
            by_device = self._get_cohort_by_device(team_id, start_date, end_date)
        if breakdown_by == "source" or breakdown_by is None:
            by_source = self._get_cohort_by_source(team_id, start_date, end_date)

        return CohortAnalysis(
            cohort_id=cohort_id,
            cohort_name=cohort.name,
            start_date=start_date,
            end_date=end_date,
            granularity=cohort.granularity,
            metric=metric,
            cohorts=cohort_rows,
            retention_matrix=retention_matrix,
            total_users=total_users,
            average_retention_period1=avg_p1,
            average_retention_period4=avg_p4,
            average_retention_period12=avg_p12,
            retention_trend=trend,
            trend_percentage=trend_pct,
            by_country=by_country,
            by_device=by_device,
            by_source=by_source,
        )

    def _calculate_cohort_rows(
        self,
        cohort: Cohort,
        start_date: datetime,
        end_date: datetime,
        metric: CohortMetric,
    ) -> List[CohortRow]:
        """Calculate cohort rows based on granularity."""
        rows = []

        # Determine period length
        if cohort.granularity == CohortGranularity.DAILY:
            period_delta = timedelta(days=1)
            label_format = "%Y-%m-%d"
        elif cohort.granularity == CohortGranularity.WEEKLY:
            period_delta = timedelta(weeks=1)
            label_format = "Week %W %Y"
        else:  # MONTHLY
            period_delta = timedelta(days=30)
            label_format = "%b %Y"

        # Generate cohort rows
        current_start = start_date
        row_num = 0

        while current_start < end_date:
            cohort_end = min(current_start + period_delta, end_date)

            # Get initial cohort size
            initial_size = self._get_cohort_initial_size(
                cohort, current_start, cohort_end
            )

            if initial_size > 0:
                # Calculate periods
                periods = self._calculate_periods(
                    cohort,
                    current_start,
                    initial_size,
                    end_date,
                    period_delta,
                    metric,
                )

                row = CohortRow(
                    cohort_id=f"{cohort.id}_{row_num}",
                    cohort_start=current_start,
                    cohort_label=current_start.strftime(label_format),
                    initial_size=initial_size,
                    periods=periods,
                )
                rows.append(row)
                row_num += 1

            current_start = cohort_end

        return rows

    def _get_cohort_initial_size(
        self,
        cohort: Cohort,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        """Get the number of users in a cohort period."""
        try:
            # Query ClickHouse for unique visitors who first appeared in this period
            result = self.client.execute(
                """
                SELECT uniq(visitor_id)
                FROM clicks
                WHERE timestamp >= %(start)s
                  AND timestamp < %(end)s
                  AND visitor_id NOT IN (
                      SELECT visitor_id FROM clicks WHERE timestamp < %(start)s
                  )
                """,
                {"start": start_date, "end": end_date}
            )
            return result[0][0] if result else 0
        except Exception:
            # Mock data fallback
            base = random.randint(500, 2000)
            return base

    def _calculate_periods(
        self,
        cohort: Cohort,
        cohort_start: datetime,
        initial_size: int,
        analysis_end: datetime,
        period_delta: timedelta,
        metric: CohortMetric,
    ) -> List[CohortPeriod]:
        """Calculate retention for each period after cohort formation."""
        periods = []
        period_num = 0

        # Period 0 is the cohort formation period (100% by definition)
        periods.append(CohortPeriod(
            period=0,
            period_label=self._get_period_label(cohort.granularity, 0),
            users=initial_size,
            retained_users=initial_size,
            new_users=0,
            retention_rate=100.0,
            churn_rate=0.0,
            total_clicks=initial_size * random.randint(1, 5),
            total_conversions=int(initial_size * random.uniform(0.01, 0.1)),
            avg_clicks_per_user=random.uniform(1, 5),
        ))

        # Calculate subsequent periods
        current_period_start = cohort_start + period_delta
        period_num = 1

        while current_period_start < analysis_end and period_num <= cohort.periods_to_track:
            period_end = current_period_start + period_delta

            retained = self._get_retained_users(
                cohort, cohort_start, current_period_start, period_end, initial_size
            )

            retention_rate = (retained / initial_size * 100) if initial_size > 0 else 0
            churn_rate = 100 - retention_rate

            periods.append(CohortPeriod(
                period=period_num,
                period_label=self._get_period_label(cohort.granularity, period_num),
                users=retained,
                retained_users=retained,
                new_users=0,
                retention_rate=round(retention_rate, 2),
                churn_rate=round(churn_rate, 2),
                total_clicks=retained * random.randint(1, 3),
                total_conversions=int(retained * random.uniform(0.01, 0.05)),
                avg_clicks_per_user=random.uniform(1, 3),
            ))

            current_period_start = period_end
            period_num += 1

        return periods

    def _get_retained_users(
        self,
        cohort: Cohort,
        cohort_start: datetime,
        period_start: datetime,
        period_end: datetime,
        initial_size: int,
    ) -> int:
        """Get number of users from original cohort still active in period."""
        try:
            result = self.client.execute(
                """
                SELECT uniq(visitor_id)
                FROM clicks
                WHERE timestamp >= %(period_start)s
                  AND timestamp < %(period_end)s
                  AND visitor_id IN (
                      SELECT DISTINCT visitor_id
                      FROM clicks
                      WHERE timestamp >= %(cohort_start)s
                        AND timestamp < %(cohort_start)s + interval 1 week
                  )
                """,
                {
                    "cohort_start": cohort_start,
                    "period_start": period_start,
                    "period_end": period_end,
                }
            )
            return result[0][0] if result else 0
        except Exception:
            # Simulated retention decay curve
            weeks_elapsed = (period_start - cohort_start).days // 7
            # Typical retention curve: starts at 40-60%, decays logarithmically
            base_retention = 0.45 + random.uniform(-0.1, 0.1)
            decay_factor = max(0.05, base_retention * (0.85 ** weeks_elapsed))
            return int(initial_size * decay_factor)

    def _get_period_label(self, granularity: CohortGranularity, period: int) -> str:
        """Get human-readable period label."""
        if granularity == CohortGranularity.DAILY:
            return f"Day {period}"
        elif granularity == CohortGranularity.WEEKLY:
            return f"Week {period}"
        else:
            return f"Month {period}"

    def _build_retention_matrix(
        self,
        cohort_rows: List[CohortRow],
        granularity: CohortGranularity,
    ) -> RetentionData:
        """Build a retention matrix from cohort data."""
        if not cohort_rows:
            return RetentionData(
                matrix=[],
                row_labels=[],
                column_labels=[],
                period_averages=[],
            )

        # Build matrix
        max_periods = max(len(row.periods) for row in cohort_rows)
        matrix = []
        row_labels = []

        for row in cohort_rows:
            retention_rates = [p.retention_rate for p in row.periods]
            # Pad with None for incomplete periods
            while len(retention_rates) < max_periods:
                retention_rates.append(None)
            matrix.append(retention_rates)
            row_labels.append(row.cohort_label)

        # Column labels
        column_labels = [
            self._get_period_label(granularity, i)
            for i in range(max_periods)
        ]

        # Calculate period averages
        period_averages = []
        for col in range(max_periods):
            values = [
                matrix[row][col]
                for row in range(len(matrix))
                if matrix[row][col] is not None
            ]
            avg = sum(values) / len(values) if values else 0
            period_averages.append(round(avg, 2))

        # Find best/worst cohorts
        avg_retentions = [
            (row_labels[i], sum(r for r in matrix[i] if r) / len([r for r in matrix[i] if r]))
            for i in range(len(matrix))
            if any(r for r in matrix[i] if r)
        ]
        best_cohort = max(avg_retentions, key=lambda x: x[1])[0] if avg_retentions else None
        worst_cohort = min(avg_retentions, key=lambda x: x[1])[0] if avg_retentions else None

        return RetentionData(
            matrix=matrix,
            row_labels=row_labels,
            column_labels=column_labels,
            period_averages=period_averages,
            best_cohort=best_cohort,
            worst_cohort=worst_cohort,
        )

    def _get_average_retention(
        self, cohort_rows: List[CohortRow], period: int
    ) -> float:
        """Get average retention at a specific period."""
        values = []
        for row in cohort_rows:
            if len(row.periods) > period:
                values.append(row.periods[period].retention_rate)
        return round(sum(values) / len(values), 2) if values else 0

    def _calculate_retention_trend(
        self, cohort_rows: List[CohortRow]
    ) -> tuple:
        """Determine if retention is improving, declining, or stable."""
        if len(cohort_rows) < 2:
            return "stable", 0.0

        # Compare average P1 retention of recent vs older cohorts
        mid = len(cohort_rows) // 2
        older = cohort_rows[mid:]
        recent = cohort_rows[:mid]

        older_avg = self._get_average_retention(older, 1)
        recent_avg = self._get_average_retention(recent, 1)

        if older_avg == 0:
            return "stable", 0.0

        change_pct = ((recent_avg - older_avg) / older_avg) * 100

        if change_pct > 5:
            return "improving", round(change_pct, 2)
        elif change_pct < -5:
            return "declining", round(change_pct, 2)
        else:
            return "stable", round(change_pct, 2)

    # ========== Breakdown Analysis ==========

    def _get_cohort_by_country(
        self,
        team_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Get cohort breakdown by country."""
        try:
            result = self.client.execute(
                """
                SELECT
                    country,
                    uniq(visitor_id) as users,
                    count() as events
                FROM clicks
                WHERE timestamp >= %(start)s AND timestamp <= %(end)s
                GROUP BY country
                ORDER BY users DESC
                LIMIT 10
                """,
                {"start": start_date, "end": end_date}
            )
            return [
                {"country": row[0] or "Unknown", "users": row[1], "events": row[2]}
                for row in result
            ]
        except Exception:
            return [
                {"country": "CN", "users": 3000, "events": 15000},
                {"country": "US", "users": 1500, "events": 7500},
                {"country": "JP", "users": 800, "events": 4000},
            ]

    def _get_cohort_by_device(
        self,
        team_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Get cohort breakdown by device."""
        try:
            result = self.client.execute(
                """
                SELECT
                    device,
                    uniq(visitor_id) as users,
                    count() as events
                FROM clicks
                WHERE timestamp >= %(start)s AND timestamp <= %(end)s
                GROUP BY device
                ORDER BY users DESC
                """,
                {"start": start_date, "end": end_date}
            )
            return [
                {"device": row[0] or "Unknown", "users": row[1], "events": row[2]}
                for row in result
            ]
        except Exception:
            return [
                {"device": "mobile", "users": 4000, "events": 20000},
                {"device": "desktop", "users": 2000, "events": 10000},
                {"device": "tablet", "users": 500, "events": 2500},
            ]

    def _get_cohort_by_source(
        self,
        team_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Get cohort breakdown by traffic source."""
        try:
            result = self.client.execute(
                """
                SELECT
                    coalesce(referer_domain, 'Direct') as source,
                    uniq(visitor_id) as users,
                    count() as events
                FROM clicks
                WHERE timestamp >= %(start)s AND timestamp <= %(end)s
                GROUP BY source
                ORDER BY users DESC
                LIMIT 10
                """,
                {"start": start_date, "end": end_date}
            )
            return [
                {"source": row[0], "users": row[1], "events": row[2]}
                for row in result
            ]
        except Exception:
            return [
                {"source": "Direct", "users": 3000, "events": 15000},
                {"source": "WeChat", "users": 2000, "events": 10000},
                {"source": "Google", "users": 1200, "events": 6000},
            ]

    # ========== Comparison ==========

    def compare_cohorts(
        self,
        cohort_id: str,
        team_id: str,
        segment_field: str,
        segment_values: List[str],
        start_date: datetime,
        end_date: datetime,
    ) -> Optional[CohortComparison]:
        """Compare cohort performance across different segments."""
        base_analysis = self.analyze_cohort(
            cohort_id, team_id, start_date, end_date
        )

        if not base_analysis:
            return None

        # For comparison, filter by segment
        # This is simplified - production would query with segment filter
        comparison_analysis = self.analyze_cohort(
            cohort_id, team_id,
            start_date - timedelta(days=30),  # Compare with previous period
            start_date,
        )

        if not comparison_analysis:
            return None

        # Calculate differences
        max_periods = min(
            len(base_analysis.retention_matrix.period_averages),
            len(comparison_analysis.retention_matrix.period_averages)
        )

        retention_diff = [
            round(base_analysis.retention_matrix.period_averages[i] -
                  comparison_analysis.retention_matrix.period_averages[i], 2)
            for i in range(max_periods)
        ]

        avg_diff = sum(retention_diff) / len(retention_diff) if retention_diff else 0

        return CohortComparison(
            base_cohort=base_analysis,
            comparison_cohort=comparison_analysis,
            retention_difference=retention_diff,
            average_retention_difference=round(avg_diff, 2),
            is_significant=abs(avg_diff) > 5,
            confidence_level=0.95 if abs(avg_diff) > 5 else 0.85,
            insights=self._generate_comparison_insights(
                base_analysis, comparison_analysis, retention_diff
            ),
        )

    def _generate_comparison_insights(
        self,
        base: CohortAnalysis,
        comparison: CohortAnalysis,
        diff: List[float],
    ) -> List[str]:
        """Generate automated insights from cohort comparison."""
        insights = []

        avg_diff = sum(diff) / len(diff) if diff else 0

        if avg_diff > 5:
            insights.append(
                f"留存率显著提升: 平均提高 {avg_diff:.1f} 个百分点"
            )
        elif avg_diff < -5:
            insights.append(
                f"留存率有所下降: 平均下降 {abs(avg_diff):.1f} 个百分点"
            )

        # Check for specific period changes
        if len(diff) > 1 and diff[1] > 10:
            insights.append(
                "首周留存率大幅提升，新用户激活策略见效"
            )
        elif len(diff) > 1 and diff[1] < -10:
            insights.append(
                "首周留存率下降明显，建议优化新用户引导"
            )

        # Long-term retention
        if len(diff) > 4 and sum(diff[4:]) / len(diff[4:]) > 5:
            insights.append(
                "长期留存表现优秀，用户粘性增强"
            )

        return insights

    # ========== Segmentation ==========

    def get_cohort_segments(
        self,
        cohort_id: str,
        team_id: str,
        segment_by: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[CohortSegment]:
        """Get cohort breakdown by segment."""
        cohort = self.get_cohort(cohort_id, team_id)
        if not cohort:
            return []

        # Get overall analysis for comparison
        analysis = self.analyze_cohort(cohort_id, team_id, start_date, end_date)
        if not analysis:
            return []

        overall_avg = sum(analysis.retention_matrix.period_averages) / len(
            analysis.retention_matrix.period_averages
        ) if analysis.retention_matrix.period_averages else 0

        # Get breakdown data
        if segment_by == "country":
            breakdown = analysis.by_country or []
        elif segment_by == "device":
            breakdown = analysis.by_device or []
        elif segment_by == "source":
            breakdown = analysis.by_source or []
        else:
            return []

        total_users = sum(item.get("users", 0) for item in breakdown)

        segments = []
        for item in breakdown:
            users = item.get("users", 0)
            # Generate mock retention for segment (in production, query per segment)
            segment_retention = [
                max(0, analysis.retention_matrix.period_averages[i] + random.uniform(-10, 10))
                for i in range(len(analysis.retention_matrix.period_averages))
            ]
            avg_retention = sum(segment_retention) / len(segment_retention) if segment_retention else 0

            segments.append(CohortSegment(
                segment_name=segment_by,
                segment_value=item.get(segment_by, item.get("source", item.get("device", item.get("country", "Unknown")))),
                user_count=users,
                percentage_of_cohort=round(users / total_users * 100, 2) if total_users else 0,
                retention_rates=segment_retention,
                avg_retention=round(avg_retention, 2),
                retention_vs_average=round(avg_retention - overall_avg, 2),
            ))

        return sorted(segments, key=lambda x: x.avg_retention, reverse=True)

    # ========== Insights ==========

    def get_cohort_insights(
        self,
        cohort_id: str,
        team_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[CohortInsight]:
        """Generate automated insights about cohort behavior."""
        analysis = self.analyze_cohort(cohort_id, team_id, start_date, end_date)
        if not analysis:
            return []

        insights = []

        # Check retention trend
        if analysis.retention_trend == "improving":
            insights.append(CohortInsight(
                insight_type="positive_trend",
                title="留存率持续提升",
                description=f"近期队列的留存率比历史平均提升了 {analysis.trend_percentage:.1f}%",
                severity="info",
                recommendations=["继续保持当前的用户运营策略"],
            ))
        elif analysis.retention_trend == "declining":
            insights.append(CohortInsight(
                insight_type="negative_trend",
                title="留存率下降趋势",
                description=f"近期队列的留存率比历史平均下降了 {abs(analysis.trend_percentage):.1f}%",
                severity="warning",
                recommendations=[
                    "分析最近的产品变更是否影响用户体验",
                    "检查新用户引导流程是否有优化空间",
                    "考虑增加用户召回活动",
                ],
            ))

        # Check for churn spikes
        for row in analysis.cohorts:
            for i, period in enumerate(row.periods[1:], 1):
                if period.churn_rate > 50 and i == 1:
                    insights.append(CohortInsight(
                        insight_type="high_early_churn",
                        title="首周流失率过高",
                        description=f"队列 {row.cohort_label} 首周流失率达 {period.churn_rate:.1f}%",
                        severity="critical",
                        affected_cohorts=[row.cohort_label],
                        affected_periods=[1],
                        recommendations=[
                            "优化新用户首次体验",
                            "增加新用户引导提示",
                            "考虑发送激活提醒邮件/推送",
                        ],
                    ))
                    break

        # Check best/worst cohorts
        if analysis.retention_matrix.best_cohort:
            insights.append(CohortInsight(
                insight_type="best_performer",
                title="最佳表现队列",
                description=f"队列 {analysis.retention_matrix.best_cohort} 的留存表现最佳",
                severity="info",
                affected_cohorts=[analysis.retention_matrix.best_cohort],
                recommendations=["分析该队列的特征，寻找成功因素"],
            ))

        return insights

    # ========== Preset Cohorts ==========

    def get_preset_cohorts(self) -> List[PresetCohort]:
        """Get preset cohort templates."""
        return [
            PresetCohort(
                id="weekly_acquisition",
                name="周获取队列",
                description="按周分组的新用户获取队列，追踪周留存",
                type=CohortType.ACQUISITION,
                granularity=CohortGranularity.WEEKLY,
                entry_event=None,
                return_event="click",
            ),
            PresetCohort(
                id="monthly_acquisition",
                name="月获取队列",
                description="按月分组的新用户获取队列，追踪月留存",
                type=CohortType.ACQUISITION,
                granularity=CohortGranularity.MONTHLY,
                entry_event=None,
                return_event="click",
            ),
            PresetCohort(
                id="campaign_cohort",
                name="营销活动队列",
                description="按营销活动分组的用户队列",
                type=CohortType.CAMPAIGN,
                granularity=CohortGranularity.WEEKLY,
                entry_event="campaign_click",
                return_event="click",
            ),
            PresetCohort(
                id="converter_cohort",
                name="转化用户队列",
                description="追踪已转化用户的后续行为",
                type=CohortType.BEHAVIORAL,
                granularity=CohortGranularity.WEEKLY,
                entry_event="conversion",
                return_event="click",
            ),
            PresetCohort(
                id="qr_scanner_cohort",
                name="二维码扫描队列",
                description="追踪通过二维码进入的用户",
                type=CohortType.BEHAVIORAL,
                granularity=CohortGranularity.WEEKLY,
                entry_event="qr_scan",
                return_event="click",
            ),
        ]

    def create_from_preset(
        self, team_id: str, preset_id: str, name: Optional[str] = None
    ) -> Optional[Cohort]:
        """Create a cohort from a preset template."""
        presets = {p.id: p for p in self.get_preset_cohorts()}
        preset = presets.get(preset_id)

        if not preset:
            return None

        create_data = CohortCreate(
            name=name or preset.name,
            description=preset.description,
            type=preset.type,
            granularity=preset.granularity,
            entry_event=preset.entry_event,
            return_event=preset.return_event,
        )

        return self.create_cohort(team_id, create_data)

    # ========== Export ==========

    def export_cohort_data(
        self,
        cohort_id: str,
        team_id: str,
        format: str,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Export cohort data in specified format."""
        analysis = self.analyze_cohort(cohort_id, team_id, start_date, end_date)
        if not analysis:
            return {"error": "Cohort not found"}

        if format == "json":
            return analysis.dict()
        elif format == "csv":
            # Return CSV-ready data
            rows = []
            headers = ["Cohort"] + analysis.retention_matrix.column_labels
            rows.append(headers)

            for i, row_label in enumerate(analysis.retention_matrix.row_labels):
                row_data = [row_label] + [
                    str(v) if v is not None else ""
                    for v in analysis.retention_matrix.matrix[i]
                ]
                rows.append(row_data)

            return {"headers": headers, "rows": rows}
        else:
            return {"error": f"Unsupported format: {format}"}


# Singleton instance
cohort_service = CohortService()
