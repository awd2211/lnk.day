"""
Funnel Analysis API Router
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel

from .models import (
    Funnel,
    FunnelCreate,
    FunnelUpdate,
    FunnelAnalysis,
    FunnelAlert,
    FunnelEvent,
    FunnelComparison,
)
from .service import funnel_service


router = APIRouter()


# ========== Request/Response Models ==========


class FunnelListResponse(BaseModel):
    funnels: List[Funnel]
    total: int


class FunnelUsersResponse(BaseModel):
    users: list
    total: int
    funnel_steps: int


class AlertCreateRequest(BaseModel):
    metric: str
    step_id: Optional[str] = None
    operator: str
    threshold: float
    notification_channels: List[str] = ["email"]
    recipients: List[str]
    check_interval_hours: int = 24
    cooldown_hours: int = 24


class PresetFunnelCreate(BaseModel):
    preset_id: str
    name: Optional[str] = None


class CompareRequest(BaseModel):
    period1_start: datetime
    period1_end: datetime
    period2_start: datetime
    period2_end: datetime


# ========== Funnel CRUD Endpoints ==========


@router.post("", response_model=Funnel)
async def create_funnel(
    data: FunnelCreate,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """创建新漏斗"""
    return funnel_service.create_funnel(x_team_id, data)


@router.get("", response_model=FunnelListResponse)
async def list_funnels(
    x_team_id: str = Header(..., alias="X-Team-ID"),
    active_only: bool = Query(True, description="只返回激活的漏斗"),
):
    """获取漏斗列表"""
    funnels = funnel_service.list_funnels(x_team_id, active_only)
    return FunnelListResponse(funnels=funnels, total=len(funnels))


@router.get("/presets")
async def get_preset_funnels():
    """获取预设漏斗模板"""
    return funnel_service.get_preset_funnels()


@router.post("/from-preset", response_model=Funnel)
async def create_from_preset(
    data: PresetFunnelCreate,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """从预设模板创建漏斗"""
    funnel = funnel_service.create_from_preset(x_team_id, data.preset_id, data.name)
    if not funnel:
        raise HTTPException(status_code=404, detail="Preset not found")
    return funnel


@router.get("/{funnel_id}", response_model=Funnel)
async def get_funnel(
    funnel_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """获取漏斗详情"""
    funnel = funnel_service.get_funnel(funnel_id, x_team_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return funnel


@router.patch("/{funnel_id}", response_model=Funnel)
async def update_funnel(
    funnel_id: str,
    data: FunnelUpdate,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """更新漏斗"""
    funnel = funnel_service.update_funnel(funnel_id, x_team_id, data)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return funnel


@router.delete("/{funnel_id}")
async def delete_funnel(
    funnel_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """删除漏斗"""
    success = funnel_service.delete_funnel(funnel_id, x_team_id)
    if not success:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return {"success": True}


# ========== Analysis Endpoints ==========


@router.get("/{funnel_id}/analyze", response_model=FunnelAnalysis)
async def analyze_funnel(
    funnel_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    breakdown_by: Optional[str] = Query(None, description="分组维度: country, device, source"),
):
    """分析漏斗性能"""
    # Default to last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    analysis = funnel_service.analyze_funnel(
        funnel_id, x_team_id, start_date, end_date, breakdown_by
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return analysis


@router.post("/{funnel_id}/compare", response_model=FunnelComparison)
async def compare_funnel_periods(
    funnel_id: str,
    data: CompareRequest,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """比较两个时间段的漏斗表现"""
    comparison = funnel_service.compare_funnels(
        funnel_id,
        x_team_id,
        data.period1_start,
        data.period1_end,
        data.period2_start,
        data.period2_end,
    )
    if not comparison:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return comparison


@router.get("/{funnel_id}/users", response_model=FunnelUsersResponse)
async def get_funnel_users(
    funnel_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None, description="用户状态: completed, in_progress, dropped"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
):
    """获取进入漏斗的用户列表"""
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    result = funnel_service.get_funnel_users(
        funnel_id, x_team_id, start_date, end_date, status, limit, offset
    )
    return FunnelUsersResponse(**result)


# ========== Alert Endpoints ==========


@router.post("/{funnel_id}/alerts", response_model=FunnelAlert)
async def create_alert(
    funnel_id: str,
    data: AlertCreateRequest,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """创建漏斗告警"""
    alert = FunnelAlert(
        id="",
        funnel_id=funnel_id,
        metric=data.metric,
        step_id=data.step_id,
        operator=data.operator,
        threshold=data.threshold,
        notification_channels=data.notification_channels,
        recipients=data.recipients,
        check_interval_hours=data.check_interval_hours,
        cooldown_hours=data.cooldown_hours,
    )
    try:
        return funnel_service.create_alert(funnel_id, x_team_id, alert)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{funnel_id}/alerts", response_model=List[FunnelAlert])
async def get_alerts(
    funnel_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """获取漏斗告警列表"""
    return funnel_service.get_alerts(funnel_id, x_team_id)


@router.patch("/alerts/{alert_id}", response_model=FunnelAlert)
async def update_alert(
    alert_id: str,
    updates: dict,
):
    """更新告警配置"""
    alert = funnel_service.update_alert(alert_id, updates)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    """删除告警"""
    success = funnel_service.delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


# ========== Event Tracking ==========


@router.post("/events")
async def track_event(event: FunnelEvent):
    """记录漏斗事件"""
    success = funnel_service.track_funnel_event(event)
    return {"success": success}


@router.post("/events/batch")
async def track_events_batch(events: List[FunnelEvent]):
    """批量记录漏斗事件"""
    results = []
    for event in events:
        success = funnel_service.track_funnel_event(event)
        results.append({"event_id": event.event_id, "success": success})
    return {"results": results, "total": len(events)}
