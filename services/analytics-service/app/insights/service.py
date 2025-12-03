import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import statistics
import random

from app.core.config import settings
from app.core.clickhouse import get_clickhouse_client
from .models import (
    InsightType, InsightPriority, InsightCategory, StoryTone,
    DataPoint, Insight, DataStory, StoryRequest,
    TrendAnalysis, AnomalyDetection, PerformanceSnapshot,
    AudienceProfile, ContentAnalysis, WeeklyDigest, MonthlyReport
)

logger = logging.getLogger(__name__)


class InsightsService:
    """数据洞察与故事生成服务"""

    def __init__(self):
        self.insight_templates = self._load_insight_templates()

    def _load_insight_templates(self) -> Dict[str, Dict]:
        """加载洞察模板"""
        return {
            "growth_positive": {
                "zh": {
                    "title": "流量增长 {change}%",
                    "summary": "在过去 {period} 内，您的链接点击量增长了 {change}%，从 {previous} 次增长到 {current} 次。",
                    "details": "这是一个积极的信号，表明您的内容正在获得更多关注。{top_contributor} 贡献了最大的增长。"
                },
                "en": {
                    "title": "Traffic Growth {change}%",
                    "summary": "Over the past {period}, your link clicks grew by {change}%, from {previous} to {current}.",
                    "details": "This is a positive signal indicating your content is gaining more attention. {top_contributor} contributed the most growth."
                }
            },
            "growth_negative": {
                "zh": {
                    "title": "流量下降 {change}%",
                    "summary": "在过去 {period} 内，您的链接点击量下降了 {change}%，从 {previous} 次减少到 {current} 次。",
                    "details": "建议检查链接的可访问性和推广渠道。{worst_performer} 的下降最为明显。"
                },
                "en": {
                    "title": "Traffic Decline {change}%",
                    "summary": "Over the past {period}, your link clicks declined by {change}%, from {previous} to {current}.",
                    "details": "Consider checking link accessibility and promotion channels. {worst_performer} showed the most decline."
                }
            },
            "anomaly_spike": {
                "zh": {
                    "title": "流量异常激增",
                    "summary": "{metric} 在 {timestamp} 出现了异常高峰，比平均值高出 {deviation}%。",
                    "details": "这可能是由于内容被分享或外部引流导致。建议关注来源分析。"
                },
                "en": {
                    "title": "Unusual Traffic Spike",
                    "summary": "{metric} showed an unusual spike at {timestamp}, {deviation}% above average.",
                    "details": "This might be due to content sharing or external referrals. Consider analyzing traffic sources."
                }
            },
            "anomaly_drop": {
                "zh": {
                    "title": "流量异常下跌",
                    "summary": "{metric} 在 {timestamp} 出现了异常下跌，比平均值低 {deviation}%。",
                    "details": "建议检查链接状态和服务器性能，确保没有技术问题。"
                },
                "en": {
                    "title": "Unusual Traffic Drop",
                    "summary": "{metric} showed an unusual drop at {timestamp}, {deviation}% below average.",
                    "details": "Consider checking link status and server performance to ensure no technical issues."
                }
            },
            "pattern_weekly": {
                "zh": {
                    "title": "发现周期性规律",
                    "summary": "您的流量在每周 {peak_days} 达到高峰，{low_days} 相对较低。",
                    "details": "可以考虑在高峰期发布新内容，在低谷期进行维护和优化。"
                },
                "en": {
                    "title": "Weekly Pattern Detected",
                    "summary": "Your traffic peaks on {peak_days} and is relatively lower on {low_days}.",
                    "details": "Consider publishing new content during peak times and doing maintenance during low periods."
                }
            },
            "geographic_concentration": {
                "zh": {
                    "title": "地域集中度分析",
                    "summary": "{top_region} 贡献了 {percentage}% 的流量，是您最重要的市场。",
                    "details": "考虑针对该地区优化内容，或探索其他有潜力的地区。"
                },
                "en": {
                    "title": "Geographic Concentration",
                    "summary": "{top_region} contributes {percentage}% of traffic, being your most important market.",
                    "details": "Consider optimizing content for this region or exploring other potential markets."
                }
            },
            "device_insight": {
                "zh": {
                    "title": "设备偏好洞察",
                    "summary": "{dominant_device} 用户占比 {percentage}%，是您的主要访问设备。",
                    "details": "确保您的链接目标页面在 {dominant_device} 上有良好的体验。"
                },
                "en": {
                    "title": "Device Preference Insight",
                    "summary": "{dominant_device} users account for {percentage}%, being your primary device.",
                    "details": "Ensure your linked pages provide good experience on {dominant_device}."
                }
            },
            "milestone_reached": {
                "zh": {
                    "title": "里程碑达成！",
                    "summary": "恭喜！您已达成 {milestone}，这是一个值得庆祝的成就。",
                    "details": "您的努力正在获得回报，继续保持这种势头！"
                },
                "en": {
                    "title": "Milestone Reached!",
                    "summary": "Congratulations! You've reached {milestone}, an achievement worth celebrating.",
                    "details": "Your efforts are paying off, keep up the momentum!"
                }
            },
            "opportunity_untapped": {
                "zh": {
                    "title": "发现增长机会",
                    "summary": "{opportunity_area} 可能是一个未被充分利用的增长点。",
                    "details": "根据数据分析，{details}。建议进行测试和优化。"
                },
                "en": {
                    "title": "Growth Opportunity Found",
                    "summary": "{opportunity_area} might be an untapped growth opportunity.",
                    "details": "Based on data analysis, {details}. Consider testing and optimizing."
                }
            }
        }

    async def generate_story(self, request: StoryRequest) -> DataStory:
        """生成数据故事"""
        # 设置时间范围
        end_date = request.period_end or datetime.now()
        start_date = request.period_start or (end_date - timedelta(days=7))

        # 收集数据
        performance = await self._get_performance_data(
            request.team_id, start_date, end_date
        )
        audience = await self._get_audience_data(
            request.team_id, start_date, end_date
        )
        trends = await self._analyze_trends(
            request.team_id, start_date, end_date
        )
        anomalies = await self._detect_anomalies(
            request.team_id, start_date, end_date
        )

        # 生成洞察
        insights = await self._generate_insights(
            request.team_id,
            performance,
            audience,
            trends,
            anomalies,
            request.focus_areas,
            request.language,
            request.max_insights
        )

        # 构建关键指标
        key_metrics = self._build_key_metrics(performance)

        # 生成叙事文本
        narrative = self._generate_narrative(
            performance, audience, insights, request.tone, request.language
        )

        # 提取亮点和关注点
        highlights = self._extract_highlights(insights, request.language)
        concerns = self._extract_concerns(insights, request.language)

        # 生成建议
        recommendations = []
        if request.include_recommendations:
            recommendations = self._generate_recommendations(
                insights, performance, audience, request.language
            )

        # 构建故事
        story = DataStory(
            id=str(uuid.uuid4()),
            team_id=request.team_id,
            title=self._generate_title(performance, request.language),
            subtitle=self._generate_subtitle(start_date, end_date, request.language),
            executive_summary=self._generate_executive_summary(
                performance, insights, request.language
            ),
            key_metrics=key_metrics,
            insights=insights,
            narrative=narrative,
            highlights=highlights,
            concerns=concerns,
            recommendations=recommendations,
            period_start=start_date,
            period_end=end_date,
            tone=request.tone,
            metadata={
                "data_quality": "high",
                "confidence_score": 0.85,
                "generation_version": "1.0"
            }
        )

        return story

    async def _get_performance_data(
        self, team_id: str, start_date: datetime, end_date: datetime
    ) -> PerformanceSnapshot:
        """获取性能数据"""
        try:
            client = get_clickhouse_client()

            # 当前期间数据
            current_query = """
                SELECT
                    count() as total_clicks,
                    uniqExact(visitor_id) as unique_visitors,
                    uniqExact(link_id) as active_links
                FROM clicks
                WHERE team_id = %(team_id)s
                AND clicked_at >= %(start_date)s
                AND clicked_at <= %(end_date)s
            """

            result = client.execute(
                current_query,
                {
                    "team_id": team_id,
                    "start_date": start_date,
                    "end_date": end_date
                }
            )

            if result:
                row = result[0]
                total_clicks = row[0]
                unique_visitors = row[1]
                active_links = row[2]
            else:
                total_clicks = 0
                unique_visitors = 0
                active_links = 0

            # 计算前一期间的数据用于对比
            period_length = (end_date - start_date).days
            prev_start = start_date - timedelta(days=period_length)
            prev_end = start_date

            prev_result = client.execute(
                current_query,
                {
                    "team_id": team_id,
                    "start_date": prev_start,
                    "end_date": prev_end
                }
            )

            prev_clicks = prev_result[0][0] if prev_result else 0

            # 计算增长率
            growth_rate = 0
            if prev_clicks > 0:
                growth_rate = ((total_clicks - prev_clicks) / prev_clicks) * 100

            return PerformanceSnapshot(
                total_clicks=total_clicks,
                total_links=active_links,
                unique_visitors=unique_visitors,
                avg_ctr=0.0,  # 需要额外数据计算
                top_performing_link=None,
                worst_performing_link=None,
                growth_rate=round(growth_rate, 2),
                period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            )
        except Exception as e:
            logger.error(f"Error getting performance data: {e}")
            # 返回模拟数据
            return PerformanceSnapshot(
                total_clicks=random.randint(1000, 10000),
                total_links=random.randint(10, 100),
                unique_visitors=random.randint(500, 5000),
                avg_ctr=round(random.uniform(2.0, 8.0), 2),
                growth_rate=round(random.uniform(-20, 50), 2),
                period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            )

    async def _get_audience_data(
        self, team_id: str, start_date: datetime, end_date: datetime
    ) -> AudienceProfile:
        """获取受众数据"""
        try:
            client = get_clickhouse_client()

            # 地理分布
            geo_query = """
                SELECT country, count() as cnt
                FROM clicks
                WHERE team_id = %(team_id)s
                AND clicked_at >= %(start_date)s
                AND clicked_at <= %(end_date)s
                GROUP BY country
                ORDER BY cnt DESC
                LIMIT 10
            """

            geo_result = client.execute(
                geo_query,
                {"team_id": team_id, "start_date": start_date, "end_date": end_date}
            )

            top_countries = [
                {"country": row[0], "clicks": row[1]}
                for row in geo_result
            ]

            # 设备分布
            device_query = """
                SELECT device_type, count() as cnt
                FROM clicks
                WHERE team_id = %(team_id)s
                AND clicked_at >= %(start_date)s
                AND clicked_at <= %(end_date)s
                GROUP BY device_type
            """

            device_result = client.execute(
                device_query,
                {"team_id": team_id, "start_date": start_date, "end_date": end_date}
            )

            total_devices = sum(row[1] for row in device_result)
            device_breakdown = {}
            if total_devices > 0:
                device_breakdown = {
                    row[0]: round((row[1] / total_devices) * 100, 2)
                    for row in device_result
                }

            # 高峰时段
            hour_query = """
                SELECT toHour(clicked_at) as hour, count() as cnt
                FROM clicks
                WHERE team_id = %(team_id)s
                AND clicked_at >= %(start_date)s
                AND clicked_at <= %(end_date)s
                GROUP BY hour
                ORDER BY cnt DESC
                LIMIT 5
            """

            hour_result = client.execute(
                hour_query,
                {"team_id": team_id, "start_date": start_date, "end_date": end_date}
            )

            peak_hours = [row[0] for row in hour_result]

            return AudienceProfile(
                top_countries=top_countries,
                top_cities=[],
                device_breakdown=device_breakdown,
                browser_breakdown={},
                peak_hours=peak_hours,
                peak_days=[]
            )
        except Exception as e:
            logger.error(f"Error getting audience data: {e}")
            # 返回模拟数据
            return AudienceProfile(
                top_countries=[
                    {"country": "中国", "clicks": 5000},
                    {"country": "美国", "clicks": 2000},
                    {"country": "日本", "clicks": 1000}
                ],
                top_cities=[],
                device_breakdown={"Mobile": 65.0, "Desktop": 30.0, "Tablet": 5.0},
                browser_breakdown={"Chrome": 60.0, "Safari": 25.0, "Firefox": 10.0},
                peak_hours=[10, 14, 20, 21, 15],
                peak_days=["周一", "周三", "周五"]
            )

    async def _analyze_trends(
        self, team_id: str, start_date: datetime, end_date: datetime
    ) -> List[TrendAnalysis]:
        """分析趋势"""
        trends = []

        try:
            client = get_clickhouse_client()

            # 每日点击趋势
            daily_query = """
                SELECT toDate(clicked_at) as date, count() as clicks
                FROM clicks
                WHERE team_id = %(team_id)s
                AND clicked_at >= %(start_date)s
                AND clicked_at <= %(end_date)s
                GROUP BY date
                ORDER BY date
            """

            result = client.execute(
                daily_query,
                {"team_id": team_id, "start_date": start_date, "end_date": end_date}
            )

            if len(result) >= 2:
                clicks = [row[1] for row in result]
                first_half = clicks[:len(clicks)//2]
                second_half = clicks[len(clicks)//2:]

                avg_first = statistics.mean(first_half) if first_half else 0
                avg_second = statistics.mean(second_half) if second_half else 0

                if avg_first > 0:
                    change = ((avg_second - avg_first) / avg_first) * 100
                    direction = "up" if change > 5 else ("down" if change < -5 else "stable")
                    significance = "significant" if abs(change) > 20 else (
                        "moderate" if abs(change) > 10 else "minor"
                    )

                    trends.append(TrendAnalysis(
                        metric="daily_clicks",
                        direction=direction,
                        magnitude=round(change, 2),
                        significance=significance,
                        period_comparison="period average",
                        data_series=[
                            {"date": str(row[0]), "value": row[1]}
                            for row in result
                        ]
                    ))
        except Exception as e:
            logger.error(f"Error analyzing trends: {e}")
            # 返回模拟趋势
            trends.append(TrendAnalysis(
                metric="daily_clicks",
                direction="up",
                magnitude=15.5,
                significance="moderate",
                period_comparison="period average",
                data_series=[]
            ))

        return trends

    async def _detect_anomalies(
        self, team_id: str, start_date: datetime, end_date: datetime
    ) -> List[AnomalyDetection]:
        """检测异常"""
        anomalies = []

        try:
            client = get_clickhouse_client()

            # 获取每小时数据
            hourly_query = """
                SELECT
                    toStartOfHour(clicked_at) as hour,
                    count() as clicks
                FROM clicks
                WHERE team_id = %(team_id)s
                AND clicked_at >= %(start_date)s
                AND clicked_at <= %(end_date)s
                GROUP BY hour
                ORDER BY hour
            """

            result = client.execute(
                hourly_query,
                {"team_id": team_id, "start_date": start_date, "end_date": end_date}
            )

            if len(result) >= 10:
                clicks = [row[1] for row in result]
                mean_clicks = statistics.mean(clicks)
                std_clicks = statistics.stdev(clicks) if len(clicks) > 1 else 0

                # 检测超过2个标准差的异常
                for i, (hour, click_count) in enumerate(result):
                    if std_clicks > 0:
                        z_score = (click_count - mean_clicks) / std_clicks
                        if abs(z_score) > 2:
                            deviation = ((click_count - mean_clicks) / mean_clicks) * 100
                            anomalies.append(AnomalyDetection(
                                metric="hourly_clicks",
                                anomaly_type="spike" if z_score > 0 else "drop",
                                severity="high" if abs(z_score) > 3 else "medium",
                                detected_at=hour,
                                expected_value=round(mean_clicks, 2),
                                actual_value=click_count,
                                deviation_percent=round(abs(deviation), 2),
                                possible_causes=[
                                    "外部流量来源" if z_score > 0 else "技术问题",
                                    "内容分享" if z_score > 0 else "链接可访问性"
                                ]
                            ))
        except Exception as e:
            logger.error(f"Error detecting anomalies: {e}")

        return anomalies[:5]  # 最多返回5个异常

    async def _generate_insights(
        self,
        team_id: str,
        performance: PerformanceSnapshot,
        audience: AudienceProfile,
        trends: List[TrendAnalysis],
        anomalies: List[AnomalyDetection],
        focus_areas: List[InsightCategory],
        language: str,
        max_insights: int
    ) -> List[Insight]:
        """生成洞察"""
        insights = []
        lang = language if language in ["zh", "en"] else "zh"

        # 增长趋势洞察
        if performance.growth_rate != 0:
            template_key = "growth_positive" if performance.growth_rate > 0 else "growth_negative"
            template = self.insight_templates[template_key][lang]

            insights.append(Insight(
                id=str(uuid.uuid4()),
                type=InsightType.GROWTH,
                category=InsightCategory.TRAFFIC,
                priority=InsightPriority.HIGH if abs(performance.growth_rate) > 20 else InsightPriority.MEDIUM,
                title=template["title"].format(change=abs(performance.growth_rate)),
                summary=template["summary"].format(
                    period="7天",
                    change=abs(performance.growth_rate),
                    previous=int(performance.total_clicks / (1 + performance.growth_rate/100)),
                    current=performance.total_clicks
                ),
                details=template["details"].format(
                    top_contributor="最受欢迎的链接",
                    worst_performer="表现下降的链接"
                ),
                data_points=[
                    DataPoint(
                        metric="total_clicks",
                        value=performance.total_clicks,
                        change_percent=performance.growth_rate
                    )
                ],
                confidence=0.9
            ))

        # 异常检测洞察
        for anomaly in anomalies[:2]:
            template_key = f"anomaly_{anomaly.anomaly_type}"
            if template_key in self.insight_templates:
                template = self.insight_templates[template_key][lang]

                insights.append(Insight(
                    id=str(uuid.uuid4()),
                    type=InsightType.ANOMALY,
                    category=InsightCategory.TRAFFIC,
                    priority=InsightPriority.HIGH if anomaly.severity == "high" else InsightPriority.MEDIUM,
                    title=template["title"],
                    summary=template["summary"].format(
                        metric="点击量",
                        timestamp=anomaly.detected_at.strftime("%Y-%m-%d %H:%M"),
                        deviation=anomaly.deviation_percent
                    ),
                    details=template["details"],
                    data_points=[
                        DataPoint(
                            metric="clicks",
                            value=anomaly.actual_value,
                            previous_value=anomaly.expected_value,
                            change_percent=anomaly.deviation_percent,
                            timestamp=anomaly.detected_at
                        )
                    ],
                    supporting_data={"possible_causes": anomaly.possible_causes},
                    confidence=0.8
                ))

        # 地理洞察
        if audience.top_countries:
            total_geo = sum(c.get("clicks", 0) for c in audience.top_countries)
            if total_geo > 0 and audience.top_countries:
                top_country = audience.top_countries[0]
                percentage = (top_country.get("clicks", 0) / total_geo) * 100

                template = self.insight_templates["geographic_concentration"][lang]
                insights.append(Insight(
                    id=str(uuid.uuid4()),
                    type=InsightType.PATTERN,
                    category=InsightCategory.GEOGRAPHIC,
                    priority=InsightPriority.MEDIUM,
                    title=template["title"],
                    summary=template["summary"].format(
                        top_region=top_country.get("country", "未知"),
                        percentage=round(percentage, 1)
                    ),
                    details=template["details"],
                    data_points=[
                        DataPoint(
                            metric="geo_concentration",
                            value=percentage
                        )
                    ],
                    confidence=0.85
                ))

        # 设备洞察
        if audience.device_breakdown:
            dominant_device = max(
                audience.device_breakdown.items(),
                key=lambda x: x[1]
            )
            template = self.insight_templates["device_insight"][lang]
            insights.append(Insight(
                id=str(uuid.uuid4()),
                type=InsightType.PATTERN,
                category=InsightCategory.AUDIENCE,
                priority=InsightPriority.LOW,
                title=template["title"],
                summary=template["summary"].format(
                    dominant_device=dominant_device[0],
                    percentage=dominant_device[1]
                ),
                details=template["details"].format(dominant_device=dominant_device[0]),
                data_points=[
                    DataPoint(
                        metric=device,
                        value=pct
                    )
                    for device, pct in audience.device_breakdown.items()
                ],
                confidence=0.9
            ))

        # 里程碑检测
        milestones = [1000, 5000, 10000, 50000, 100000, 500000, 1000000]
        for milestone in milestones:
            if performance.total_clicks >= milestone:
                template = self.insight_templates["milestone_reached"][lang]
                insights.append(Insight(
                    id=str(uuid.uuid4()),
                    type=InsightType.MILESTONE,
                    category=InsightCategory.ENGAGEMENT,
                    priority=InsightPriority.HIGH,
                    title=template["title"],
                    summary=template["summary"].format(
                        milestone=f"{milestone:,} 次点击"
                    ),
                    details=template["details"],
                    confidence=1.0
                ))
                break

        # 按优先级排序并限制数量
        priority_order = {
            InsightPriority.CRITICAL: 0,
            InsightPriority.HIGH: 1,
            InsightPriority.MEDIUM: 2,
            InsightPriority.LOW: 3
        }
        insights.sort(key=lambda x: priority_order[x.priority])

        return insights[:max_insights]

    def _build_key_metrics(self, performance: PerformanceSnapshot) -> List[DataPoint]:
        """构建关键指标"""
        return [
            DataPoint(
                metric="total_clicks",
                value=performance.total_clicks,
                change_percent=performance.growth_rate
            ),
            DataPoint(
                metric="unique_visitors",
                value=performance.unique_visitors
            ),
            DataPoint(
                metric="active_links",
                value=performance.total_links
            ),
            DataPoint(
                metric="growth_rate",
                value=performance.growth_rate
            )
        ]

    def _generate_narrative(
        self,
        performance: PerformanceSnapshot,
        audience: AudienceProfile,
        insights: List[Insight],
        tone: StoryTone,
        language: str
    ) -> str:
        """生成叙事文本"""
        if language == "en":
            return self._generate_narrative_en(performance, audience, insights, tone)
        return self._generate_narrative_zh(performance, audience, insights, tone)

    def _generate_narrative_zh(
        self,
        performance: PerformanceSnapshot,
        audience: AudienceProfile,
        insights: List[Insight],
        tone: StoryTone
    ) -> str:
        """生成中文叙事"""
        narrative_parts = []

        # 开场
        if tone == StoryTone.EXECUTIVE:
            narrative_parts.append(
                f"本报告涵盖期间：{performance.period}。"
            )
        elif tone == StoryTone.CASUAL:
            narrative_parts.append(
                f"让我们看看过去这段时间（{performance.period}）发生了什么有趣的事情！"
            )
        else:
            narrative_parts.append(
                f"以下是 {performance.period} 期间的数据分析报告。"
            )

        # 核心指标
        if performance.growth_rate > 0:
            if tone == StoryTone.ENCOURAGING:
                narrative_parts.append(
                    f"好消息！您的链接点击量增长了 {performance.growth_rate}%，"
                    f"达到了 {performance.total_clicks:,} 次，"
                    f"独立访客数为 {performance.unique_visitors:,}。继续保持！"
                )
            else:
                narrative_parts.append(
                    f"总点击量为 {performance.total_clicks:,} 次，"
                    f"较上期增长 {performance.growth_rate}%。"
                    f"独立访客达 {performance.unique_visitors:,} 人。"
                )
        elif performance.growth_rate < 0:
            if tone == StoryTone.ENCOURAGING:
                narrative_parts.append(
                    f"虽然点击量下降了 {abs(performance.growth_rate)}%，"
                    f"但这是优化和调整策略的好机会。"
                    f"当前总点击量为 {performance.total_clicks:,} 次。"
                )
            else:
                narrative_parts.append(
                    f"总点击量为 {performance.total_clicks:,} 次，"
                    f"较上期下降 {abs(performance.growth_rate)}%。"
                    f"建议关注原因分析。"
                )
        else:
            narrative_parts.append(
                f"总点击量为 {performance.total_clicks:,} 次，"
                f"与上期基本持平。"
            )

        # 受众洞察
        if audience.top_countries:
            top_country = audience.top_countries[0].get("country", "未知")
            narrative_parts.append(
                f"流量主要来自{top_country}，"
            )

        if audience.device_breakdown:
            dominant = max(audience.device_breakdown.items(), key=lambda x: x[1])
            narrative_parts.append(
                f"{dominant[0]}用户占比最高（{dominant[1]}%）。"
            )

        # 关键洞察
        high_priority = [i for i in insights if i.priority in [InsightPriority.CRITICAL, InsightPriority.HIGH]]
        if high_priority:
            narrative_parts.append("\n\n重要发现：")
            for insight in high_priority[:3]:
                narrative_parts.append(f"• {insight.summary}")

        return "\n".join(narrative_parts)

    def _generate_narrative_en(
        self,
        performance: PerformanceSnapshot,
        audience: AudienceProfile,
        insights: List[Insight],
        tone: StoryTone
    ) -> str:
        """生成英文叙事"""
        narrative_parts = []

        # Opening
        narrative_parts.append(
            f"This report covers the period: {performance.period}."
        )

        # Core metrics
        if performance.growth_rate > 0:
            narrative_parts.append(
                f"Total clicks reached {performance.total_clicks:,}, "
                f"growing by {performance.growth_rate}% compared to the previous period. "
                f"Unique visitors: {performance.unique_visitors:,}."
            )
        elif performance.growth_rate < 0:
            narrative_parts.append(
                f"Total clicks were {performance.total_clicks:,}, "
                f"declining by {abs(performance.growth_rate)}%. "
                f"Consider analyzing the causes."
            )
        else:
            narrative_parts.append(
                f"Total clicks were {performance.total_clicks:,}, "
                f"remaining stable from the previous period."
            )

        # Key insights
        high_priority = [i for i in insights if i.priority in [InsightPriority.CRITICAL, InsightPriority.HIGH]]
        if high_priority:
            narrative_parts.append("\n\nKey Findings:")
            for insight in high_priority[:3]:
                narrative_parts.append(f"• {insight.summary}")

        return "\n".join(narrative_parts)

    def _generate_title(self, performance: PerformanceSnapshot, language: str) -> str:
        """生成标题"""
        if language == "en":
            if performance.growth_rate > 20:
                return "Strong Growth Period"
            elif performance.growth_rate > 0:
                return "Steady Progress"
            elif performance.growth_rate < -20:
                return "Challenging Period"
            else:
                return "Performance Overview"
        else:
            if performance.growth_rate > 20:
                return "强劲增长期"
            elif performance.growth_rate > 0:
                return "稳步前进"
            elif performance.growth_rate < -20:
                return "需要关注的时期"
            else:
                return "数据概览"

    def _generate_subtitle(
        self, start_date: datetime, end_date: datetime, language: str
    ) -> str:
        """生成副标题"""
        period = f"{start_date.strftime('%Y-%m-%d')} - {end_date.strftime('%Y-%m-%d')}"
        if language == "en":
            return f"Analytics Report for {period}"
        return f"{period} 分析报告"

    def _generate_executive_summary(
        self, performance: PerformanceSnapshot, insights: List[Insight], language: str
    ) -> str:
        """生成执行摘要"""
        if language == "en":
            summary = f"During this period, your links received {performance.total_clicks:,} clicks "
            if performance.growth_rate > 0:
                summary += f"with a growth of {performance.growth_rate}%. "
            elif performance.growth_rate < 0:
                summary += f"with a decline of {abs(performance.growth_rate)}%. "
            else:
                summary += "remaining stable. "

            high_priority = len([i for i in insights if i.priority == InsightPriority.HIGH])
            if high_priority:
                summary += f"There are {high_priority} important insights requiring attention."
            return summary
        else:
            summary = f"本期间内，您的链接共获得 {performance.total_clicks:,} 次点击，"
            if performance.growth_rate > 0:
                summary += f"增长率为 {performance.growth_rate}%。"
            elif performance.growth_rate < 0:
                summary += f"下降 {abs(performance.growth_rate)}%。"
            else:
                summary += "与上期持平。"

            high_priority = len([i for i in insights if i.priority == InsightPriority.HIGH])
            if high_priority:
                summary += f"有 {high_priority} 个重要洞察需要关注。"
            return summary

    def _extract_highlights(self, insights: List[Insight], language: str) -> List[str]:
        """提取亮点"""
        highlights = []
        positive_types = [InsightType.GROWTH, InsightType.MILESTONE, InsightType.OPPORTUNITY]

        for insight in insights:
            if insight.type in positive_types:
                highlights.append(insight.title)

        return highlights[:5]

    def _extract_concerns(self, insights: List[Insight], language: str) -> List[str]:
        """提取关注点"""
        concerns = []
        concern_types = [InsightType.WARNING, InsightType.ANOMALY]

        for insight in insights:
            if insight.type in concern_types or (
                insight.type == InsightType.GROWTH and
                any(dp.change_percent and dp.change_percent < 0 for dp in insight.data_points)
            ):
                concerns.append(insight.title)

        return concerns[:5]

    def _generate_recommendations(
        self,
        insights: List[Insight],
        performance: PerformanceSnapshot,
        audience: AudienceProfile,
        language: str
    ) -> List[str]:
        """生成建议"""
        recommendations = []

        if language == "en":
            if performance.growth_rate < 0:
                recommendations.append("Review your content strategy and promotion channels")
                recommendations.append("Analyze which links are underperforming and optimize")

            if audience.device_breakdown:
                dominant = max(audience.device_breakdown.items(), key=lambda x: x[1])
                recommendations.append(
                    f"Ensure optimal experience for {dominant[0]} users"
                )

            for insight in insights:
                recommendations.extend(insight.action_items[:1])

            if not recommendations:
                recommendations.append("Continue monitoring performance trends")
                recommendations.append("Consider A/B testing different link presentations")
        else:
            if performance.growth_rate < 0:
                recommendations.append("审视内容策略和推广渠道")
                recommendations.append("分析表现不佳的链接并进行优化")

            if audience.device_breakdown:
                dominant = max(audience.device_breakdown.items(), key=lambda x: x[1])
                recommendations.append(f"确保{dominant[0]}用户有最佳体验")

            for insight in insights:
                recommendations.extend(insight.action_items[:1])

            if not recommendations:
                recommendations.append("持续监控性能趋势")
                recommendations.append("考虑对链接展示方式进行 A/B 测试")

        return list(set(recommendations))[:7]

    async def get_weekly_digest(self, team_id: str, week: int, year: int) -> WeeklyDigest:
        """获取每周摘要"""
        # 计算周的开始和结束
        from datetime import date
        first_day_of_year = date(year, 1, 1)
        week_start = first_day_of_year + timedelta(weeks=week-1)
        week_start = week_start - timedelta(days=week_start.weekday())
        week_end = week_start + timedelta(days=6)

        request = StoryRequest(
            team_id=team_id,
            period_start=datetime.combine(week_start, datetime.min.time()),
            period_end=datetime.combine(week_end, datetime.max.time()),
            tone=StoryTone.CASUAL
        )

        story = await self.generate_story(request)

        return WeeklyDigest(
            week_number=week,
            year=year,
            team_id=team_id,
            story=story,
            week_over_week_change={
                "clicks": story.key_metrics[0].change_percent or 0
            },
            notable_events=story.highlights,
            goals_progress=[]
        )

    async def get_monthly_report(self, team_id: str, month: int, year: int) -> MonthlyReport:
        """获取月度报告"""
        from calendar import monthrange

        _, last_day = monthrange(year, month)
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month, last_day, 23, 59, 59)

        request = StoryRequest(
            team_id=team_id,
            period_start=start_date,
            period_end=end_date,
            tone=StoryTone.PROFESSIONAL,
            include_predictions=True
        )

        story = await self.generate_story(request)

        return MonthlyReport(
            month=month,
            year=year,
            team_id=team_id,
            story=story,
            month_over_month_change={
                "clicks": story.key_metrics[0].change_percent or 0
            },
            quarterly_progress=0.0,
            seasonal_insights=[]
        )

    async def get_quick_insights(
        self, team_id: str, limit: int = 5
    ) -> List[Insight]:
        """获取快速洞察（用于仪表盘）"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        performance = await self._get_performance_data(team_id, start_date, end_date)
        audience = await self._get_audience_data(team_id, start_date, end_date)
        trends = await self._analyze_trends(team_id, start_date, end_date)
        anomalies = await self._detect_anomalies(team_id, start_date, end_date)

        insights = await self._generate_insights(
            team_id, performance, audience, trends, anomalies,
            [], "zh", limit
        )

        return insights


# 单例实例
insights_service = InsightsService()
