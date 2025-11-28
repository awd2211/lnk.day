"""
API endpoints for task scheduler management.
Provides monitoring, manual triggers, and configuration.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.task_scheduler import task_scheduler

router = APIRouter()


class TaskStatusResponse(BaseModel):
    name: str
    description: str
    frequency: str
    enabled: bool
    is_running: bool
    last_run: Optional[str]
    next_run: Optional[str]


class TaskHistoryEntry(BaseModel):
    task_name: str
    started_at: str
    completed_at: Optional[str]
    success: bool
    error: Optional[str]
    duration_seconds: float


class TaskExecutionResponse(BaseModel):
    task_name: str
    started_at: str
    completed_at: Optional[str]
    success: bool
    error: Optional[str]
    duration_seconds: float
    result: Optional[Dict[str, Any]]


class SchedulerStatsResponse(BaseModel):
    total_tasks: int
    enabled_tasks: int
    running_tasks: int
    tasks: List[TaskStatusResponse]


@router.get("/", response_model=SchedulerStatsResponse)
async def get_scheduler_stats():
    """Get overall scheduler statistics and all task statuses"""
    tasks = task_scheduler.get_all_tasks_status()

    enabled_count = sum(1 for t in tasks if t["enabled"])
    running_count = sum(1 for t in tasks if t["is_running"])

    return SchedulerStatsResponse(
        total_tasks=len(tasks),
        enabled_tasks=enabled_count,
        running_tasks=running_count,
        tasks=[TaskStatusResponse(**t) for t in tasks],
    )


@router.get("/{task_name}", response_model=TaskStatusResponse)
async def get_task_status(task_name: str):
    """Get status of a specific task"""
    status = task_scheduler.get_task_status(task_name)

    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])

    return TaskStatusResponse(**status)


@router.get("/{task_name}/history", response_model=List[TaskHistoryEntry])
async def get_task_history(task_name: str, limit: int = Query(default=10, le=100)):
    """Get execution history for a task"""
    history = await task_scheduler.get_task_history(task_name, limit)
    return [TaskHistoryEntry(**h) for h in history]


@router.post("/{task_name}/run", response_model=TaskExecutionResponse)
async def run_task_now(task_name: str):
    """Manually trigger a task execution"""
    try:
        result = await task_scheduler.run_task_now(task_name)

        if not result:
            raise HTTPException(
                status_code=500,
                detail="Task execution failed to return result"
            )

        return TaskExecutionResponse(
            task_name=result.task_name,
            started_at=result.started_at.isoformat(),
            completed_at=result.completed_at.isoformat() if result.completed_at else None,
            success=result.success,
            error=result.error,
            duration_seconds=result.duration_seconds,
            result=result.result,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{task_name}/enable")
async def enable_task(task_name: str):
    """Enable a task"""
    status = task_scheduler.get_task_status(task_name)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])

    task_scheduler.enable_task(task_name)
    return {"message": f"Task {task_name} enabled", "enabled": True}


@router.post("/{task_name}/disable")
async def disable_task(task_name: str):
    """Disable a task"""
    status = task_scheduler.get_task_status(task_name)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])

    task_scheduler.disable_task(task_name)
    return {"message": f"Task {task_name} disabled", "enabled": False}


# Predefined task groups for bulk operations
TASK_GROUPS = {
    "cleanup": [
        "cleanup_expired_links",
        "cleanup_old_analytics",
        "cleanup_temp_files",
        "cleanup_orphaned_data",
    ],
    "aggregation": [
        "aggregate_daily_stats",
        "aggregate_weekly_stats",
        "aggregate_monthly_stats",
        "compute_trending_links",
        "compute_link_insights",
        "update_leaderboards",
    ],
    "security": [
        "batch_security_scan",
        "scan_new_links",
        "rescan_suspicious_links",
        "update_threat_database",
    ],
}


@router.get("/groups/{group_name}")
async def get_task_group(group_name: str):
    """Get tasks in a group"""
    if group_name not in TASK_GROUPS:
        raise HTTPException(
            status_code=404,
            detail=f"Group {group_name} not found. Available: {list(TASK_GROUPS.keys())}"
        )

    tasks = []
    for task_name in TASK_GROUPS[group_name]:
        status = task_scheduler.get_task_status(task_name)
        if "error" not in status:
            tasks.append(TaskStatusResponse(**status))

    return {
        "group": group_name,
        "task_count": len(tasks),
        "tasks": tasks,
    }


@router.post("/groups/{group_name}/run")
async def run_task_group(group_name: str):
    """Run all tasks in a group sequentially"""
    if group_name not in TASK_GROUPS:
        raise HTTPException(
            status_code=404,
            detail=f"Group {group_name} not found"
        )

    results = []
    for task_name in TASK_GROUPS[group_name]:
        try:
            result = await task_scheduler.run_task_now(task_name)
            results.append({
                "task_name": task_name,
                "success": result.success if result else False,
                "error": result.error if result else "No result",
            })
        except Exception as e:
            results.append({
                "task_name": task_name,
                "success": False,
                "error": str(e),
            })

    success_count = sum(1 for r in results if r["success"])

    return {
        "group": group_name,
        "total_tasks": len(results),
        "successful": success_count,
        "failed": len(results) - success_count,
        "results": results,
    }
