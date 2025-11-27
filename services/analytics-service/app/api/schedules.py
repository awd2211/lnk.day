from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.schedule import (
    ReportScheduleCreate,
    ReportScheduleUpdate,
    ReportSchedule,
    ScheduleExecutionLog,
)
from app.services.schedule_service import schedule_service

router = APIRouter()


@router.post("", response_model=ReportSchedule)
async def create_schedule(data: ReportScheduleCreate):
    """创建定时报告"""
    return schedule_service.create_schedule(data)


@router.get("", response_model=List[ReportSchedule])
async def list_schedules(team_id: str = Query(...)):
    """获取团队的所有定时报告"""
    return schedule_service.get_schedules_by_team(team_id)


@router.get("/{schedule_id}", response_model=ReportSchedule)
async def get_schedule(schedule_id: str):
    """获取单个定时报告详情"""
    schedule = schedule_service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=ReportSchedule)
async def update_schedule(schedule_id: str, data: ReportScheduleUpdate):
    """更新定时报告"""
    schedule = schedule_service.update_schedule(schedule_id, data)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """删除定时报告"""
    if not schedule_service.delete_schedule(schedule_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}


@router.post("/{schedule_id}/toggle")
async def toggle_schedule(schedule_id: str):
    """启用/禁用定时报告"""
    schedule = schedule_service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    updated = schedule_service.update_schedule(
        schedule_id,
        ReportScheduleUpdate(enabled=not schedule.enabled)
    )
    return updated


@router.get("/{schedule_id}/logs", response_model=List[ScheduleExecutionLog])
async def get_schedule_logs(schedule_id: str, limit: int = Query(default=20, le=100)):
    """获取定时报告执行日志"""
    schedule = schedule_service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    return schedule_service.get_execution_logs(schedule_id, limit)


@router.post("/{schedule_id}/run")
async def run_schedule_now(schedule_id: str):
    """立即执行定时报告"""
    from app.api.reports import ReportRequest, ReportFormat, ReportType, generate_report_task
    import asyncio

    schedule = schedule_service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Create report request from schedule
    format_map = {
        "pdf": ReportFormat.PDF,
        "csv": ReportFormat.CSV,
        "json": ReportFormat.JSON,
    }
    frequency_map = {
        "daily": ReportType.DAILY,
        "weekly": ReportType.WEEKLY,
        "monthly": ReportType.MONTHLY,
    }

    request = ReportRequest(
        team_id=schedule.team_id,
        report_type=frequency_map.get(schedule.frequency, ReportType.WEEKLY),
        format=format_map.get(schedule.format, ReportFormat.PDF),
        include_traffic=schedule.include_traffic,
        include_geographic=schedule.include_geographic,
        include_devices=schedule.include_devices,
        include_referrers=schedule.include_referrers,
    )

    # Generate report ID
    import uuid
    report_id = str(uuid.uuid4())

    # Run the report generation task
    try:
        await generate_report_task(report_id, request)
        schedule_service.mark_schedule_executed(schedule_id, success=True, report_id=report_id)
        return {
            "message": "Report generation started",
            "report_id": report_id,
            "download_url": f"/api/reports/{report_id}/download"
        }
    except Exception as e:
        schedule_service.mark_schedule_executed(schedule_id, success=False, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
