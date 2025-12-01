"""
用户留存分析 API 端点
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Request

from app.services.retention_service import retention_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/retention", tags=["retention"])


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse date string in various formats"""
    if not date_str:
        return None

    for fmt in [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    return None


def get_date_params(request: Request) -> tuple[Optional[datetime], Optional[datetime]]:
    """Extract start_date and end_date from request query params"""
    params = dict(request.query_params)
    start_str = params.get("startDate") or params.get("start_date")
    end_str = params.get("endDate") or params.get("end_date")
    return parse_date(start_str), parse_date(end_str)


@router.get("/cohort")
async def get_cohort_analysis(
    request: Request,
    cohort_size: str = Query(default="week", description="群组粒度: day, week, month"),
    retention_periods: int = Query(default=8, le=24, description="分析周期数"),
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    群组留存分析
    按首次访问时间将用户分组，分析各群组的回访留存情况

    返回示例:
    {
        "cohort_size": "week",
        "retention_periods": 8,
        "cohorts": [
            {
                "cohort_date": "2024-01-01",
                "initial_users": 100,
                "retention": [
                    {"period": 0, "users": 100, "rate": 100},
                    {"period": 1, "users": 45, "rate": 45},
                    {"period": 2, "users": 30, "rate": 30},
                    ...
                ]
            }
        ]
    }
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=90)
    if not end_date:
        end_date = datetime.now()

    if cohort_size not in ["day", "week", "month"]:
        raise HTTPException(status_code=400, detail="cohort_size must be day, week, or month")

    try:
        result = retention_service.get_cohort_analysis(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            cohort_size=cohort_size,
            retention_periods=retention_periods
        )
        return result
    except Exception as e:
        logger.error(f"Cohort analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rate")
async def get_retention_rate(
    request: Request,
    period_days: int = Query(default=7, le=30, description="每个周期的天数"),
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    留存率分析
    计算各时间周期的用户留存率
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=90)
    if not end_date:
        end_date = datetime.now()

    try:
        result = retention_service.get_user_retention_rate(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            period_days=period_days
        )
        return result
    except Exception as e:
        logger.error(f"Retention rate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/visitors")
async def get_new_vs_returning_visitors(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    新访客 vs 回访访客分析
    分析时间段内的新老访客比例和趋势
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        result = retention_service.get_returning_vs_new_visitors(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Visitor analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frequency")
async def get_visitor_frequency(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    访问频率分析
    分析用户的访问次数分布
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        result = retention_service.get_visitor_frequency(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Frequency analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recency")
async def get_recency_analysis(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    最近活跃度分析 (Recency)
    分析用户最后一次访问距今的时间分布
    """
    params = dict(request.query_params)
    end_str = params.get("endDate") or params.get("end_date")
    end_date = parse_date(end_str) or datetime.now()

    try:
        result = retention_service.get_recency_analysis(
            team_id=team_id,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Recency analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/churn")
async def get_churn_analysis(
    request: Request,
    churn_days: int = Query(default=30, le=90, description="流失判定天数"),
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    用户流失分析
    分析在指定时间段内活跃但之后未再访问的用户
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=60)
    if not end_date:
        end_date = datetime.now() - timedelta(days=30)

    try:
        result = retention_service.get_churn_analysis(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            churn_days=churn_days
        )
        return result
    except Exception as e:
        logger.error(f"Churn analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lifecycle")
async def get_lifecycle_stages(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    用户生命周期阶段分析
    将用户分为：新用户、活跃用户、沉默用户、流失用户等阶段

    阶段定义:
    - New: 首次访问在7天内
    - Active: 最近7天内有访问
    - Engaged: 最近30天内有访问
    - At Risk: 31-60天未访问
    - Dormant: 61-90天未访问
    - Churned: 超过90天未访问
    """
    params = dict(request.query_params)
    end_str = params.get("endDate") or params.get("end_date")
    end_date = parse_date(end_str) or datetime.now()

    try:
        result = retention_service.get_lifecycle_stages(
            team_id=team_id,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Lifecycle analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_retention_summary(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    留存分析概览
    返回所有关键留存指标的汇总
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        # 获取各项数据
        visitors = retention_service.get_returning_vs_new_visitors(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )

        frequency = retention_service.get_visitor_frequency(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )

        lifecycle = retention_service.get_lifecycle_stages(
            team_id=team_id,
            end_date=end_date
        )

        retention_rate = retention_service.get_user_retention_rate(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            period_days=7
        )

        return {
            "period": {
                "start": str(start_date),
                "end": str(end_date)
            },
            "visitors": visitors["summary"],
            "frequency": {
                "total_unique_visitors": frequency["total_unique_visitors"],
                "average_visits_per_user": frequency["average_visits_per_user"]
            },
            "lifecycle": {
                "health_score": lifecycle["health_score"],
                "total_users": lifecycle["total_users"],
                "stages_summary": {
                    stage["stage"]: {
                        "users": stage["users"],
                        "percentage": stage["percentage"]
                    }
                    for stage in lifecycle["stages"]
                }
            },
            "retention": {
                "initial_users": retention_rate["initial_users"],
                "average_retention": retention_rate["average_retention"],
                "week1_retention": next(
                    (r["rate"] for r in retention_rate["retention"] if r["period"] == 1),
                    0
                )
            }
        }
    except Exception as e:
        logger.error(f"Retention summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
