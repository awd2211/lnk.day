from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from app.services.analytics_service import AnalyticsService
from app.services.realtime_service import realtime_service
from app.models.analytics import AnalyticsResponse

router = APIRouter()
analytics_service = AnalyticsService()


@router.get("/link/{link_id}", response_model=AnalyticsResponse)
async def get_link_analytics(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """获取链接分析数据"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_link_analytics(link_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team")
async def get_team_analytics(
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """获取团队分析数据（包含所有统计信息）"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_team_analytics(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{team_id}/summary")
async def get_team_summary(
    team_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """获取团队统计概览"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_team_summary(team_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime/{link_id}")
async def get_realtime_stats(link_id: str):
    """获取实时统计数据"""
    try:
        return await realtime_service.get_realtime_stats(link_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime/team/{team_id}")
async def get_team_realtime_stats(team_id: str):
    """获取团队实时统计数据"""
    try:
        return await realtime_service.get_team_realtime_stats(team_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/hourly")
async def get_hourly_stats(
    link_id: str,
    hours: int = Query(default=24, le=168),  # max 7 days
):
    """获取按小时统计数据"""
    end_date = datetime.now()
    start_date = end_date - timedelta(hours=hours)

    try:
        return analytics_service.get_hourly_stats(link_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/compare")
async def compare_periods(
    link_id: str,
    current_start: datetime = Query(...),
    current_end: datetime = Query(...),
    previous_start: datetime = Query(...),
    previous_end: datetime = Query(...),
):
    """对比两个时间段的数据"""
    try:
        current = analytics_service.get_link_analytics(link_id, current_start, current_end)
        previous = analytics_service.get_link_analytics(link_id, previous_start, previous_end)

        return {
            "current": current,
            "previous": previous,
            "change": {
                "total_clicks": current.total_clicks - previous.total_clicks,
                "total_clicks_percent": (
                    ((current.total_clicks - previous.total_clicks) / previous.total_clicks * 100)
                    if previous.total_clicks > 0
                    else 0
                ),
                "unique_clicks": current.unique_clicks - previous.unique_clicks,
                "unique_clicks_percent": (
                    ((current.unique_clicks - previous.unique_clicks) / previous.unique_clicks * 100)
                    if previous.unique_clicks > 0
                    else 0
                ),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/geo")
async def get_geo_stats(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    limit: int = Query(default=20, le=100),
):
    """获取地理位置统计"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_geo_detailed(link_id, start_date, end_date, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/devices")
async def get_device_stats(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """获取设备/浏览器/操作系统统计"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return {
            "devices": analytics_service.get_device_detailed(link_id, start_date, end_date),
            "browsers": analytics_service.get_browser_detailed(link_id, start_date, end_date),
            "os": analytics_service.get_os_distribution(link_id, start_date, end_date),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/referrers")
async def get_referrer_stats(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    limit: int = Query(default=20, le=100),
):
    """获取来源统计"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_referrer_detailed(link_id, start_date, end_date, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/hourly-activity")
async def get_hourly_activity(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """获取按星期和小时的访问热力图数据"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_hourly_activity(link_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{team_id}/hourly-activity")
async def get_team_hourly_activity(
    team_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """获取团队按星期和小时的访问热力图数据"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        return analytics_service.get_team_hourly_activity(team_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
