"""
营销归因分析 API 端点
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Request

from app.services.attribution_service import attribution_service, AttributionModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attribution", tags=["attribution"])


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


@router.get("/models")
async def get_attribution_models():
    """
    获取可用的归因模型列表
    """
    return {
        "models": [
            {
                "id": AttributionModel.FIRST_TOUCH.value,
                "name": "首次触点归因",
                "description": "100% 归因给用户的第一个接触点，适合品牌认知分析"
            },
            {
                "id": AttributionModel.LAST_TOUCH.value,
                "name": "末次触点归因",
                "description": "100% 归因给用户的最后一个接触点，适合直接转化分析"
            },
            {
                "id": AttributionModel.LINEAR.value,
                "name": "线性归因",
                "description": "所有接触点平均分配转化功劳，适合多触点分析"
            },
            {
                "id": AttributionModel.TIME_DECAY.value,
                "name": "时间衰减归因",
                "description": "越接近转化的接触点获得越多功劳，适合短周期决策"
            },
            {
                "id": AttributionModel.POSITION.value,
                "name": "位置归因 (U型)",
                "description": "首末接触点各获40%，中间平分20%，平衡分析"
            }
        ]
    }


@router.get("/channel")
async def get_channel_attribution(
    request: Request,
    model: str = Query(
        default="last_touch",
        description="归因模型: first_touch, last_touch, linear, time_decay, position"
    ),
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    渠道归因分析
    分析不同流量来源/渠道对转化的贡献
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        attribution_model = AttributionModel(model)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Must be one of: {', '.join(m.value for m in AttributionModel)}"
        )

    try:
        result = attribution_service.get_channel_attribution(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            model=attribution_model
        )
        return result
    except Exception as e:
        logger.error(f"Channel attribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign")
async def get_campaign_attribution(
    request: Request,
    model: str = Query(
        default="last_touch",
        description="归因模型"
    ),
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    营销活动归因分析
    分析各营销活动 (UTM 标签) 的转化贡献
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        attribution_model = AttributionModel(model)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid attribution model")

    try:
        result = attribution_service.get_campaign_attribution(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            model=attribution_model
        )
        return result
    except Exception as e:
        logger.error(f"Campaign attribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/touchpoints")
async def get_touchpoint_analysis(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    触点路径分析
    分析用户的典型转化路径和各渠道在路径中的位置
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        result = attribution_service.get_touchpoint_analysis(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Touchpoint analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assisted")
async def get_assisted_conversions(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    辅助转化分析
    分析各渠道作为辅助触点 vs 成交触点的贡献

    返回每个渠道的:
    - first_touch_conversions: 作为首次触点的转化数
    - last_touch_conversions: 作为末次触点的转化数
    - assisted_conversions: 作为辅助触点的次数
    - assist_ratio: 辅助转化比率 (辅助数/成交数)
    - role: 渠道角色 (introducer/closer/influencer/balanced)
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        result = attribution_service.get_assisted_conversions(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Assisted conversions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/multi-touch")
async def get_multi_touch_attribution(
    request: Request,
    model: str = Query(
        default="linear",
        description="归因模型"
    ),
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    多触点归因分析
    使用指定模型计算每个渠道的归因贡献值

    支持的模型:
    - first_touch: 首次触点
    - last_touch: 末次触点
    - linear: 线性
    - time_decay: 时间衰减
    - position: 位置 (U型)
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        attribution_model = AttributionModel(model)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid attribution model")

    try:
        result = attribution_service.get_multi_touch_attribution(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            model=attribution_model
        )
        return result
    except Exception as e:
        logger.error(f"Multi-touch attribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_attribution_models(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    对比不同归因模型的结果
    帮助理解不同模型对渠道评估的差异，并提供推荐
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        result = attribution_service.compare_attribution_models(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )
        return result
    except Exception as e:
        logger.error(f"Model comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_attribution_summary(
    request: Request,
    team_id: Optional[str] = Query(default=None, description="团队 ID"),
):
    """
    归因分析概览
    返回所有关键归因指标的汇总，使用默认的线性归因模型
    """
    start_date, end_date = get_date_params(request)

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        # 获取各项数据
        channel = attribution_service.get_channel_attribution(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            model=AttributionModel.LINEAR
        )

        touchpoints = attribution_service.get_touchpoint_analysis(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )

        assisted = attribution_service.get_assisted_conversions(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "period": {
                "start": str(start_date),
                "end": str(end_date)
            },
            "total_clicks": channel["total_clicks"],
            "total_visitors": channel["total_visitors"],
            "top_channels": channel["channels"][:5],
            "average_path_length": touchpoints["average_path_length"],
            "top_paths": touchpoints["top_paths"][:5],
            "channel_roles": [
                {
                    "channel": ch["channel"],
                    "role": ch["role"],
                    "assist_ratio": ch["assist_ratio"]
                }
                for ch in assisted["channels"][:5]
            ],
            "insights": assisted.get("insights", [])
        }
    except Exception as e:
        logger.error(f"Attribution summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
