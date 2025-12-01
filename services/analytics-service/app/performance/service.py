import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import statistics

from app.core.clickhouse import get_clickhouse_client
from .models import (
    MetricType, AlertSeverity, TimeGranularity,
    PerformanceMetric, PerformanceThreshold, PerformanceAlert,
    ServiceHealthStatus, RedirectPerformance, PerformanceQuery,
    PerformanceSummary, PerformanceReport, PerformanceTrend,
    SystemPerformance
)

logger = logging.getLogger(__name__)


class PerformanceService:
    """性能监控服务"""

    # 默认性能阈值
    DEFAULT_THRESHOLDS = {
        MetricType.REDIRECT_LATENCY: PerformanceThreshold(
            metric_type=MetricType.REDIRECT_LATENCY,
            warning_threshold=100,   # 100ms 警告
            critical_threshold=500,  # 500ms 严重
        ),
        MetricType.ERROR_RATE: PerformanceThreshold(
            metric_type=MetricType.ERROR_RATE,
            warning_threshold=1.0,   # 1% 警告
            critical_threshold=5.0,  # 5% 严重
        ),
        MetricType.AVAILABILITY: PerformanceThreshold(
            metric_type=MetricType.AVAILABILITY,
            warning_threshold=99.5,  # 99.5% 警告
            critical_threshold=99.0, # 99% 严重
            operator="lt",
        ),
        MetricType.CACHE_HIT_RATE: PerformanceThreshold(
            metric_type=MetricType.CACHE_HIT_RATE,
            warning_threshold=80,    # 80% 警告
            critical_threshold=50,   # 50% 严重
            operator="lt",
        ),
    }

    def __init__(self):
        self.thresholds = self.DEFAULT_THRESHOLDS.copy()

    @property
    def client(self):
        """Get a fresh ClickHouse client"""
        return get_clickhouse_client()

    async def get_redirect_performance(
        self,
        team_id: Optional[str] = None,
        link_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> RedirectPerformance:
        """获取重定向性能统计"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(hours=1))

        # 构建查询条件
        conditions = ["timestamp >= %(start_date)s", "timestamp <= %(end_date)s"]
        params = {"start_date": start_date, "end_date": end_date}

        if team_id:
            conditions.append("team_id = %(team_id)s")
            params["team_id"] = team_id
        if link_id:
            conditions.append("link_id = %(link_id)s")
            params["link_id"] = link_id

        where_clause = " AND ".join(conditions)

        # 查询延迟统计
        latency_query = f"""
        SELECT
            count() as total,
            avg(latency_ms) as avg_latency,
            quantile(0.5)(latency_ms) as p50,
            quantile(0.9)(latency_ms) as p90,
            quantile(0.95)(latency_ms) as p95,
            quantile(0.99)(latency_ms) as p99,
            max(latency_ms) as max_latency,
            min(latency_ms) as min_latency,
            countIf(status_code >= 400) as error_count,
            countIf(cache_hit = 1) as cache_hits
        FROM link_events
        WHERE {where_clause}
        """

        try:
            result = self.client.execute(latency_query, params)
            if result and result[0]:
                row = result[0]
                total = row[0] or 0
                error_count = row[8] or 0
                cache_hits = row[9] or 0

                return RedirectPerformance(
                    total_redirects=total,
                    avg_latency_ms=row[1] or 0,
                    p50_latency_ms=row[2] or 0,
                    p90_latency_ms=row[3] or 0,
                    p95_latency_ms=row[4] or 0,
                    p99_latency_ms=row[5] or 0,
                    max_latency_ms=row[6] or 0,
                    min_latency_ms=row[7] or 0,
                    error_count=error_count,
                    error_rate=(error_count / total * 100) if total > 0 else 0,
                    cache_hit_rate=(cache_hits / total * 100) if total > 0 else 0,
                    timestamp=datetime.now(),
                )
        except Exception as e:
            logger.error(f"Failed to get redirect performance: {e}")

        return RedirectPerformance(
            total_redirects=0,
            avg_latency_ms=0,
            p50_latency_ms=0,
            p90_latency_ms=0,
            p95_latency_ms=0,
            p99_latency_ms=0,
            max_latency_ms=0,
            min_latency_ms=0,
            error_count=0,
            error_rate=0,
            cache_hit_rate=0,
            timestamp=datetime.now(),
        )

    async def get_latency_time_series(
        self,
        team_id: Optional[str] = None,
        link_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        granularity: TimeGranularity = TimeGranularity.HOUR,
    ) -> List[Dict[str, Any]]:
        """获取延迟时间序列"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(days=1))

        # 根据粒度选择时间函数
        time_func = {
            TimeGranularity.MINUTE: "toStartOfMinute",
            TimeGranularity.HOUR: "toStartOfHour",
            TimeGranularity.DAY: "toStartOfDay",
        }[granularity]

        conditions = ["timestamp >= %(start_date)s", "timestamp <= %(end_date)s"]
        params = {"start_date": start_date, "end_date": end_date}

        if team_id:
            conditions.append("team_id = %(team_id)s")
            params["team_id"] = team_id
        if link_id:
            conditions.append("link_id = %(link_id)s")
            params["link_id"] = link_id

        where_clause = " AND ".join(conditions)

        query = f"""
        SELECT
            {time_func}(timestamp) as time_bucket,
            count() as total,
            avg(latency_ms) as avg_latency,
            quantile(0.95)(latency_ms) as p95_latency,
            countIf(status_code >= 400) as errors,
            countIf(cache_hit = 1) as cache_hits
        FROM link_events
        WHERE {where_clause}
        GROUP BY time_bucket
        ORDER BY time_bucket
        """

        try:
            result = self.client.execute(query, params)
            return [
                {
                    "timestamp": row[0],
                    "total_requests": row[1],
                    "avg_latency_ms": row[2],
                    "p95_latency_ms": row[3],
                    "errors": row[4],
                    "error_rate": (row[4] / row[1] * 100) if row[1] > 0 else 0,
                    "cache_hits": row[5],
                    "cache_hit_rate": (row[5] / row[1] * 100) if row[1] > 0 else 0,
                }
                for row in result
            ]
        except Exception as e:
            logger.error(f"Failed to get latency time series: {e}")
            return []

    async def get_slowest_links(
        self,
        team_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """获取最慢的链接"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(days=1))

        query = """
        SELECT
            link_id,
            short_code,
            count() as total_requests,
            avg(latency_ms) as avg_latency,
            quantile(0.95)(latency_ms) as p95_latency,
            max(latency_ms) as max_latency
        FROM link_events
        WHERE team_id = %(team_id)s
          AND timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY link_id, short_code
        HAVING total_requests >= 10
        ORDER BY avg_latency DESC
        LIMIT %(limit)s
        """

        try:
            result = self.client.execute(query, {
                "team_id": team_id,
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit,
            })
            return [
                {
                    "link_id": row[0],
                    "short_code": row[1],
                    "total_requests": row[2],
                    "avg_latency_ms": row[3],
                    "p95_latency_ms": row[4],
                    "max_latency_ms": row[5],
                }
                for row in result
            ]
        except Exception as e:
            logger.error(f"Failed to get slowest links: {e}")
            return []

    async def get_error_links(
        self,
        team_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """获取错误率最高的链接"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(days=1))

        query = """
        SELECT
            link_id,
            short_code,
            count() as total_requests,
            countIf(status_code >= 400) as error_count,
            countIf(status_code >= 400) / count() * 100 as error_rate
        FROM link_events
        WHERE team_id = %(team_id)s
          AND timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY link_id, short_code
        HAVING total_requests >= 10 AND error_count > 0
        ORDER BY error_rate DESC
        LIMIT %(limit)s
        """

        try:
            result = self.client.execute(query, {
                "team_id": team_id,
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit,
            })
            return [
                {
                    "link_id": row[0],
                    "short_code": row[1],
                    "total_requests": row[2],
                    "error_count": row[3],
                    "error_rate": row[4],
                }
                for row in result
            ]
        except Exception as e:
            logger.error(f"Failed to get error links: {e}")
            return []

    async def get_geo_latency(
        self,
        team_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, float]:
        """获取各地区平均延迟"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(days=1))

        query = """
        SELECT
            country,
            avg(latency_ms) as avg_latency
        FROM link_events
        WHERE team_id = %(team_id)s
          AND timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
          AND country != ''
        GROUP BY country
        ORDER BY avg_latency DESC
        """

        try:
            result = self.client.execute(query, {
                "team_id": team_id,
                "start_date": start_date,
                "end_date": end_date,
            })
            return {row[0]: row[1] for row in result}
        except Exception as e:
            logger.error(f"Failed to get geo latency: {e}")
            return {}

    async def get_performance_summary(
        self,
        team_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> PerformanceSummary:
        """获取性能摘要"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(days=1))
        duration_seconds = (end_date - start_date).total_seconds()

        # 获取基础统计
        perf = await self.get_redirect_performance(team_id, None, start_date, end_date)

        # 获取慢链接
        slowest = await self.get_slowest_links(team_id, start_date, end_date, 5)

        # 获取错误链接
        error_links = await self.get_error_links(team_id, start_date, end_date, 5)

        # 获取地区延迟
        geo_latency = await self.get_geo_latency(team_id, start_date, end_date)

        # 计算可用性 (100% - error_rate)
        availability = 100 - perf.error_rate

        return PerformanceSummary(
            period_start=start_date,
            period_end=end_date,
            total_requests=perf.total_redirects,
            avg_response_time_ms=perf.avg_latency_ms,
            p95_response_time_ms=perf.p95_latency_ms,
            error_rate=perf.error_rate,
            availability=availability,
            cache_hit_rate=perf.cache_hit_rate,
            throughput_per_second=perf.total_redirects / duration_seconds if duration_seconds > 0 else 0,
            top_slowest_links=slowest,
            top_error_links=error_links,
            geo_latency=geo_latency,
        )

    async def generate_performance_report(
        self,
        team_id: str,
        name: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> PerformanceReport:
        """生成性能报告"""
        end_date = end_date or datetime.now()
        start_date = start_date or (end_date - timedelta(days=7))

        # 获取摘要
        summary = await self.get_performance_summary(team_id, start_date, end_date)

        # 获取时间序列数据
        time_series = await self.get_latency_time_series(
            team_id, None, start_date, end_date, TimeGranularity.HOUR
        )

        # 转换为指标列表
        metrics = [
            PerformanceMetric(
                timestamp=ts["timestamp"],
                metric_type=MetricType.REDIRECT_LATENCY,
                value=ts["avg_latency_ms"],
                unit="ms",
            )
            for ts in time_series
        ]

        # 检查告警
        alerts = await self.check_alerts(team_id, summary)

        # 生成建议
        recommendations = self._generate_recommendations(summary, alerts)

        return PerformanceReport(
            id=str(uuid.uuid4()),
            team_id=team_id,
            name=name,
            created_at=datetime.now(),
            period_start=start_date,
            period_end=end_date,
            summary=summary,
            metrics=metrics,
            alerts=alerts,
            recommendations=recommendations,
        )

    async def check_alerts(
        self,
        team_id: str,
        summary: Optional[PerformanceSummary] = None,
    ) -> List[PerformanceAlert]:
        """检查性能告警"""
        if not summary:
            summary = await self.get_performance_summary(team_id)

        alerts = []

        # 检查延迟
        latency_threshold = self.thresholds.get(MetricType.REDIRECT_LATENCY)
        if latency_threshold:
            if summary.avg_response_time_ms >= latency_threshold.critical_threshold:
                alerts.append(PerformanceAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    metric_type=MetricType.REDIRECT_LATENCY,
                    current_value=summary.avg_response_time_ms,
                    threshold_value=latency_threshold.critical_threshold,
                    severity=AlertSeverity.CRITICAL,
                    message=f"平均响应时间 ({summary.avg_response_time_ms:.1f}ms) 超过严重阈值 ({latency_threshold.critical_threshold}ms)",
                    team_id=team_id,
                ))
            elif summary.avg_response_time_ms >= latency_threshold.warning_threshold:
                alerts.append(PerformanceAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    metric_type=MetricType.REDIRECT_LATENCY,
                    current_value=summary.avg_response_time_ms,
                    threshold_value=latency_threshold.warning_threshold,
                    severity=AlertSeverity.WARNING,
                    message=f"平均响应时间 ({summary.avg_response_time_ms:.1f}ms) 超过警告阈值 ({latency_threshold.warning_threshold}ms)",
                    team_id=team_id,
                ))

        # 检查错误率
        error_threshold = self.thresholds.get(MetricType.ERROR_RATE)
        if error_threshold:
            if summary.error_rate >= error_threshold.critical_threshold:
                alerts.append(PerformanceAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    metric_type=MetricType.ERROR_RATE,
                    current_value=summary.error_rate,
                    threshold_value=error_threshold.critical_threshold,
                    severity=AlertSeverity.CRITICAL,
                    message=f"错误率 ({summary.error_rate:.2f}%) 超过严重阈值 ({error_threshold.critical_threshold}%)",
                    team_id=team_id,
                ))
            elif summary.error_rate >= error_threshold.warning_threshold:
                alerts.append(PerformanceAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    metric_type=MetricType.ERROR_RATE,
                    current_value=summary.error_rate,
                    threshold_value=error_threshold.warning_threshold,
                    severity=AlertSeverity.WARNING,
                    message=f"错误率 ({summary.error_rate:.2f}%) 超过警告阈值 ({error_threshold.warning_threshold}%)",
                    team_id=team_id,
                ))

        # 检查缓存命中率
        cache_threshold = self.thresholds.get(MetricType.CACHE_HIT_RATE)
        if cache_threshold:
            if summary.cache_hit_rate <= cache_threshold.critical_threshold:
                alerts.append(PerformanceAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    metric_type=MetricType.CACHE_HIT_RATE,
                    current_value=summary.cache_hit_rate,
                    threshold_value=cache_threshold.critical_threshold,
                    severity=AlertSeverity.CRITICAL,
                    message=f"缓存命中率 ({summary.cache_hit_rate:.1f}%) 低于严重阈值 ({cache_threshold.critical_threshold}%)",
                    team_id=team_id,
                ))
            elif summary.cache_hit_rate <= cache_threshold.warning_threshold:
                alerts.append(PerformanceAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    metric_type=MetricType.CACHE_HIT_RATE,
                    current_value=summary.cache_hit_rate,
                    threshold_value=cache_threshold.warning_threshold,
                    severity=AlertSeverity.WARNING,
                    message=f"缓存命中率 ({summary.cache_hit_rate:.1f}%) 低于警告阈值 ({cache_threshold.warning_threshold}%)",
                    team_id=team_id,
                ))

        return alerts

    async def get_performance_trend(
        self,
        team_id: str,
        metric_type: MetricType,
        days: int = 7,
    ) -> PerformanceTrend:
        """获取性能趋势"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        mid_date = end_date - timedelta(days=days // 2)

        # 当前期间
        current_perf = await self.get_redirect_performance(team_id, None, mid_date, end_date)

        # 之前期间
        previous_perf = await self.get_redirect_performance(team_id, None, start_date, mid_date)

        # 获取时间序列
        time_series = await self.get_latency_time_series(
            team_id, None, start_date, end_date, TimeGranularity.DAY
        )

        # 根据指标类型获取值
        current_value = 0
        previous_value = 0
        if metric_type == MetricType.REDIRECT_LATENCY:
            current_value = current_perf.avg_latency_ms
            previous_value = previous_perf.avg_latency_ms
        elif metric_type == MetricType.ERROR_RATE:
            current_value = current_perf.error_rate
            previous_value = previous_perf.error_rate
        elif metric_type == MetricType.CACHE_HIT_RATE:
            current_value = current_perf.cache_hit_rate
            previous_value = previous_perf.cache_hit_rate
        elif metric_type == MetricType.THROUGHPUT:
            current_value = current_perf.total_redirects
            previous_value = previous_perf.total_redirects

        # 计算变化
        if previous_value > 0:
            change = ((current_value - previous_value) / previous_value) * 100
        else:
            change = 0

        # 判断趋势 (对于延迟和错误率，降低是好的)
        if metric_type in [MetricType.REDIRECT_LATENCY, MetricType.ERROR_RATE]:
            if change < -5:
                trend = "improving"
            elif change > 5:
                trend = "degrading"
            else:
                trend = "stable"
        else:
            if change > 5:
                trend = "improving"
            elif change < -5:
                trend = "degrading"
            else:
                trend = "stable"

        return PerformanceTrend(
            metric_type=metric_type,
            current_value=current_value,
            previous_value=previous_value,
            change_percentage=change,
            trend=trend,
            data_points=time_series,
        )

    def _generate_recommendations(
        self,
        summary: PerformanceSummary,
        alerts: List[PerformanceAlert],
    ) -> List[str]:
        """生成优化建议"""
        recommendations = []

        # 延迟建议
        if summary.avg_response_time_ms > 100:
            recommendations.append(
                "考虑启用 CDN 来减少地理位置带来的延迟"
            )
        if summary.p95_response_time_ms > summary.avg_response_time_ms * 2:
            recommendations.append(
                "P95 延迟显著高于平均值，建议检查是否有特定链接或地区存在性能问题"
            )

        # 缓存建议
        if summary.cache_hit_rate < 80:
            recommendations.append(
                f"缓存命中率较低 ({summary.cache_hit_rate:.1f}%)，考虑增加缓存 TTL 或预热热门链接"
            )

        # 错误率建议
        if summary.error_rate > 1:
            recommendations.append(
                f"错误率为 {summary.error_rate:.2f}%，建议检查错误日志并修复问题链接"
            )

        # 慢链接建议
        if summary.top_slowest_links:
            slowest = summary.top_slowest_links[0]
            if slowest.get("avg_latency_ms", 0) > 200:
                recommendations.append(
                    f"链接 {slowest.get('short_code')} 平均延迟 {slowest.get('avg_latency_ms'):.0f}ms，"
                    "考虑检查目标 URL 的响应时间"
                )

        # 地区延迟建议
        if summary.geo_latency:
            high_latency_regions = [
                region for region, latency in summary.geo_latency.items()
                if latency > 200
            ]
            if high_latency_regions:
                recommendations.append(
                    f"以下地区延迟较高: {', '.join(high_latency_regions[:3])}，"
                    "考虑在这些地区部署边缘节点"
                )

        # 吞吐量建议
        if summary.throughput_per_second > 100:
            recommendations.append(
                "流量较高，确保后端服务有足够的扩展能力"
            )

        if not recommendations:
            recommendations.append("系统性能良好，继续保持当前配置")

        return recommendations

    def set_threshold(self, threshold: PerformanceThreshold) -> None:
        """设置性能阈值"""
        self.thresholds[threshold.metric_type] = threshold

    def get_thresholds(self) -> Dict[MetricType, PerformanceThreshold]:
        """获取所有阈值"""
        return self.thresholds.copy()


# 单例
performance_service = PerformanceService()
