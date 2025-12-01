from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException

from .models import (
    MetricType, TimeGranularity, PerformanceThreshold,
    RedirectPerformance, PerformanceSummary, PerformanceReport,
    PerformanceTrend, PerformanceAlert
)
from .service import performance_service

router = APIRouter()


@router.get("/redirect", response_model=RedirectPerformance)
async def get_redirect_performance(
    team_id: Optional[str] = Query(None, description="团队 ID"),
    link_id: Optional[str] = Query(None, description="链接 ID"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """获取重定向性能统计"""
    return await performance_service.get_redirect_performance(
        team_id, link_id, start_date, end_date
    )


@router.get("/latency-series")
async def get_latency_time_series(
    team_id: Optional[str] = Query(None, description="团队 ID"),
    link_id: Optional[str] = Query(None, description="链接 ID"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
    granularity: TimeGranularity = Query(TimeGranularity.HOUR, description="时间粒度"),
):
    """获取延迟时间序列"""
    return await performance_service.get_latency_time_series(
        team_id, link_id, start_date, end_date, granularity
    )


@router.get("/slowest-links")
async def get_slowest_links(
    team_id: str = Query(..., description="团队 ID"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
):
    """获取最慢的链接"""
    return await performance_service.get_slowest_links(
        team_id, start_date, end_date, limit
    )


@router.get("/error-links")
async def get_error_links(
    team_id: str = Query(..., description="团队 ID"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
):
    """获取错误率最高的链接"""
    return await performance_service.get_error_links(
        team_id, start_date, end_date, limit
    )


@router.get("/geo-latency")
async def get_geo_latency(
    team_id: str = Query(..., description="团队 ID"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """获取各地区平均延迟"""
    return await performance_service.get_geo_latency(team_id, start_date, end_date)


@router.get("/summary", response_model=PerformanceSummary)
async def get_performance_summary(
    team_id: str = Query(..., description="团队 ID"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """获取性能摘要"""
    return await performance_service.get_performance_summary(
        team_id, start_date, end_date
    )


@router.post("/report", response_model=PerformanceReport)
async def generate_performance_report(
    team_id: str = Query(..., description="团队 ID"),
    name: str = Query("Performance Report", description="报告名称"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """生成性能报告"""
    return await performance_service.generate_performance_report(
        team_id, name, start_date, end_date
    )


@router.get("/alerts", response_model=List[PerformanceAlert])
async def check_alerts(
    team_id: str = Query(..., description="团队 ID"),
):
    """检查性能告警"""
    return await performance_service.check_alerts(team_id)


@router.get("/trend", response_model=PerformanceTrend)
async def get_performance_trend(
    team_id: str = Query(..., description="团队 ID"),
    metric_type: MetricType = Query(
        MetricType.REDIRECT_LATENCY,
        description="指标类型"
    ),
    days: int = Query(7, ge=1, le=90, description="天数"),
):
    """获取性能趋势"""
    return await performance_service.get_performance_trend(
        team_id, metric_type, days
    )


@router.get("/thresholds")
async def get_thresholds():
    """获取性能阈值配置"""
    thresholds = performance_service.get_thresholds()
    return {k.value: v.model_dump() for k, v in thresholds.items()}


@router.put("/thresholds/{metric_type}")
async def update_threshold(
    metric_type: MetricType,
    warning_threshold: float = Query(..., description="警告阈值"),
    critical_threshold: float = Query(..., description="严重阈值"),
    operator: str = Query("gt", description="运算符: gt, lt, gte, lte"),
):
    """更新性能阈值"""
    threshold = PerformanceThreshold(
        metric_type=metric_type,
        warning_threshold=warning_threshold,
        critical_threshold=critical_threshold,
        operator=operator,
    )
    performance_service.set_threshold(threshold)
    return {"message": "Threshold updated", "threshold": threshold.model_dump()}


@router.get("/dashboard")
async def get_performance_dashboard(
    team_id: str = Query(..., description="团队 ID"),
):
    """获取性能仪表盘数据"""
    # 获取最近 24 小时的数据
    end_date = datetime.now()
    start_date = end_date - timedelta(hours=24)

    # 并行获取所有数据
    summary = await performance_service.get_performance_summary(
        team_id, start_date, end_date
    )

    # 获取最近 1 小时的高精度数据
    recent_series = await performance_service.get_latency_time_series(
        team_id, None,
        end_date - timedelta(hours=1), end_date,
        TimeGranularity.MINUTE
    )

    # 获取趋势
    latency_trend = await performance_service.get_performance_trend(
        team_id, MetricType.REDIRECT_LATENCY, 7
    )
    error_trend = await performance_service.get_performance_trend(
        team_id, MetricType.ERROR_RATE, 7
    )

    # 获取告警
    alerts = await performance_service.check_alerts(team_id, summary)

    return {
        "summary": summary.model_dump(),
        "recent_series": recent_series,
        "trends": {
            "latency": latency_trend.model_dump(),
            "error_rate": error_trend.model_dump(),
        },
        "alerts": [a.model_dump() for a in alerts],
        "generated_at": datetime.now().isoformat(),
    }


@router.get("/realtime")
async def get_realtime_performance(
    team_id: Optional[str] = Query(None, description="团队 ID"),
):
    """获取实时性能数据 (最近 5 分钟)"""
    end_date = datetime.now()
    start_date = end_date - timedelta(minutes=5)

    perf = await performance_service.get_redirect_performance(
        team_id, None, start_date, end_date
    )

    series = await performance_service.get_latency_time_series(
        team_id, None, start_date, end_date, TimeGranularity.MINUTE
    )

    return {
        "performance": perf.model_dump(),
        "series": series,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/compare")
async def compare_performance(
    team_id: str = Query(..., description="团队 ID"),
    period1_start: datetime = Query(..., description="第一期间开始时间"),
    period1_end: datetime = Query(..., description="第一期间结束时间"),
    period2_start: datetime = Query(..., description="第二期间开始时间"),
    period2_end: datetime = Query(..., description="第二期间结束时间"),
):
    """比较两个时间段的性能"""
    perf1 = await performance_service.get_redirect_performance(
        team_id, None, period1_start, period1_end
    )
    perf2 = await performance_service.get_redirect_performance(
        team_id, None, period2_start, period2_end
    )

    def calc_change(v1, v2):
        if v1 == 0:
            return 0
        return ((v2 - v1) / v1) * 100

    return {
        "period1": {
            "start": period1_start,
            "end": period1_end,
            "performance": perf1.model_dump(),
        },
        "period2": {
            "start": period2_start,
            "end": period2_end,
            "performance": perf2.model_dump(),
        },
        "comparison": {
            "total_redirects_change": calc_change(
                perf1.total_redirects, perf2.total_redirects
            ),
            "avg_latency_change": calc_change(
                perf1.avg_latency_ms, perf2.avg_latency_ms
            ),
            "error_rate_change": calc_change(
                perf1.error_rate, perf2.error_rate
            ),
            "cache_hit_rate_change": calc_change(
                perf1.cache_hit_rate, perf2.cache_hit_rate
            ),
        },
    }
