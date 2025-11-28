from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Query, Response
from typing import List, Optional
from datetime import datetime

from .models import (
    ReportConfig,
    ScheduledReportConfig,
    ReportCreateRequest,
    ScheduledReportCreateRequest,
    ReportResult,
    ReportJob,
    ReportFormat,
    ReportMetric,
    ReportDimension,
    DateRange,
    ReportSchedule,
)
from .service import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


# ========== One-time Reports ==========


@router.post("/generate", response_model=ReportResult)
async def generate_report(
    request: ReportCreateRequest,
    x_team_id: str = Header(...),
    x_user_id: str = Header(...),
):
    """Generate a report immediately."""
    try:
        result = await report_service.generate_report(
            config=request.config,
            team_id=x_team_id,
            user_id=x_user_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/async")
async def generate_report_async(
    request: ReportCreateRequest,
    x_team_id: str = Header(...),
    x_user_id: str = Header(...),
):
    """Queue a report for asynchronous generation."""
    try:
        job = await report_service.generate_report_async(
            config=request.config,
            team_id=x_team_id,
            user_id=x_user_id,
        )
        return {
            "job_id": job.id,
            "status": job.status,
            "message": "Report generation started",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of an async report job."""
    job = report_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "result_url": job.result_url,
        "error": job.error,
        "created_at": job.created_at.isoformat(),
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/download/{job_id}")
async def download_report(job_id: str):
    """Download a completed report."""
    job = report_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Report is not ready. Status: {job.status}")

    # In production, this would fetch from S3 or storage
    # For now, regenerate the report
    result = await report_service.generate_report(
        config=job.config,
        team_id=job.team_id,
        user_id=job.user_id,
    )

    content = report_service._format_report(result, job.config.format)

    content_types = {
        ReportFormat.JSON: "application/json",
        ReportFormat.CSV: "text/csv",
        ReportFormat.EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ReportFormat.PDF: "application/pdf",
    }

    extensions = {
        ReportFormat.JSON: "json",
        ReportFormat.CSV: "csv",
        ReportFormat.EXCEL: "xlsx",
        ReportFormat.PDF: "pdf",
    }

    filename = f"report-{job_id}.{extensions[job.config.format]}"

    return Response(
        content=content,
        media_type=content_types[job.config.format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ========== Scheduled Reports ==========


@router.post("/scheduled")
async def create_scheduled_report(
    request: ScheduledReportCreateRequest,
    x_team_id: str = Header(...),
    x_user_id: str = Header(...),
):
    """Create a scheduled report."""
    try:
        report_id = await report_service.create_scheduled_report(
            config=request.config,
            team_id=x_team_id,
            user_id=x_user_id,
        )
        return {
            "report_id": report_id,
            "message": "Scheduled report created",
            "next_run": request.config.next_run.isoformat() if request.config.next_run else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduled")
async def list_scheduled_reports(x_team_id: str = Header(...)):
    """List all scheduled reports for the team."""
    reports = await report_service.get_scheduled_reports(x_team_id)
    return {"reports": reports}


@router.get("/scheduled/{report_id}")
async def get_scheduled_report(report_id: str, x_team_id: str = Header(...)):
    """Get a specific scheduled report."""
    reports = await report_service.get_scheduled_reports(x_team_id)
    for report in reports:
        if report["id"] == report_id:
            return report
    raise HTTPException(status_code=404, detail="Scheduled report not found")


@router.put("/scheduled/{report_id}")
async def update_scheduled_report(
    report_id: str,
    updates: dict,
    x_team_id: str = Header(...),
):
    """Update a scheduled report."""
    success = await report_service.update_scheduled_report(report_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return {"message": "Scheduled report updated"}


@router.delete("/scheduled/{report_id}")
async def delete_scheduled_report(report_id: str, x_team_id: str = Header(...)):
    """Delete a scheduled report."""
    success = await report_service.delete_scheduled_report(report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return {"message": "Scheduled report deleted"}


@router.post("/scheduled/{report_id}/run")
async def run_scheduled_report(
    report_id: str,
    background_tasks: BackgroundTasks,
    x_team_id: str = Header(...),
):
    """Manually trigger a scheduled report."""
    reports = await report_service.get_scheduled_reports(x_team_id)
    for report in reports:
        if report["id"] == report_id:
            # Queue for immediate execution
            background_tasks.add_task(report_service.run_scheduled_reports)
            return {"message": "Report execution triggered"}

    raise HTTPException(status_code=404, detail="Scheduled report not found")


# ========== Report Templates ==========


@router.get("/templates")
async def list_report_templates():
    """List available report templates."""
    templates = [
        {
            "id": "weekly-overview",
            "name": "Weekly Overview",
            "description": "Weekly summary of all link activity",
            "config": {
                "date_range": "last_7_days",
                "metrics": ["clicks", "unique_visitors", "conversions", "conversion_rate"],
                "dimensions": ["date"],
                "include_totals": True,
                "include_comparison": True,
            },
        },
        {
            "id": "monthly-performance",
            "name": "Monthly Performance Report",
            "description": "Detailed monthly performance breakdown",
            "config": {
                "date_range": "last_30_days",
                "metrics": ["clicks", "unique_visitors", "conversions", "revenue"],
                "dimensions": ["date", "utm_source"],
                "include_totals": True,
                "include_comparison": True,
            },
        },
        {
            "id": "geo-breakdown",
            "name": "Geographic Analysis",
            "description": "Traffic breakdown by country and city",
            "config": {
                "date_range": "last_30_days",
                "metrics": ["clicks", "unique_visitors", "conversions"],
                "dimensions": ["country"],
                "include_totals": True,
            },
        },
        {
            "id": "device-analysis",
            "name": "Device & Browser Analysis",
            "description": "Traffic breakdown by device and browser",
            "config": {
                "date_range": "last_30_days",
                "metrics": ["clicks", "bounce_rate", "conversion_rate"],
                "dimensions": ["device", "browser"],
                "include_totals": True,
            },
        },
        {
            "id": "campaign-comparison",
            "name": "Campaign Comparison",
            "description": "Compare performance across campaigns",
            "config": {
                "date_range": "last_30_days",
                "metrics": ["clicks", "conversions", "revenue", "conversion_rate"],
                "dimensions": ["campaign", "utm_source"],
                "include_totals": True,
            },
        },
        {
            "id": "traffic-sources",
            "name": "Traffic Sources Report",
            "description": "Analysis of traffic sources and referrers",
            "config": {
                "date_range": "last_30_days",
                "metrics": ["clicks", "unique_visitors", "bounce_rate"],
                "dimensions": ["utm_source", "utm_medium", "referrer"],
                "include_totals": True,
            },
        },
    ]
    return {"templates": templates}


@router.post("/templates/{template_id}/generate")
async def generate_from_template(
    template_id: str,
    overrides: Optional[dict] = None,
    x_team_id: str = Header(...),
    x_user_id: str = Header(...),
):
    """Generate a report from a template."""
    # Get template
    templates = {
        "weekly-overview": {
            "name": "Weekly Overview",
            "date_range": DateRange.LAST_7_DAYS,
            "metrics": [ReportMetric.CLICKS, ReportMetric.UNIQUE_VISITORS, ReportMetric.CONVERSIONS],
            "dimensions": [ReportDimension.DATE],
        },
        "monthly-performance": {
            "name": "Monthly Performance",
            "date_range": DateRange.LAST_30_DAYS,
            "metrics": [ReportMetric.CLICKS, ReportMetric.UNIQUE_VISITORS, ReportMetric.REVENUE],
            "dimensions": [ReportDimension.DATE, ReportDimension.UTM_SOURCE],
        },
    }

    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")

    template = templates[template_id]

    # Apply overrides
    if overrides:
        template.update(overrides)

    config = ReportConfig(**template)

    result = await report_service.generate_report(
        config=config,
        team_id=x_team_id,
        user_id=x_user_id,
    )

    return result


# ========== Metadata ==========


@router.get("/metadata/metrics")
async def get_available_metrics():
    """Get list of available metrics."""
    return {
        "metrics": [
            {"id": m.value, "name": m.value.replace("_", " ").title()}
            for m in ReportMetric
        ]
    }


@router.get("/metadata/dimensions")
async def get_available_dimensions():
    """Get list of available dimensions."""
    return {
        "dimensions": [
            {"id": d.value, "name": d.value.replace("_", " ").title()}
            for d in ReportDimension
        ]
    }


@router.get("/metadata/date-ranges")
async def get_date_ranges():
    """Get list of available date ranges."""
    return {
        "date_ranges": [
            {"id": dr.value, "name": dr.value.replace("_", " ").title()}
            for dr in DateRange
        ]
    }


@router.get("/metadata/formats")
async def get_output_formats():
    """Get list of available output formats."""
    return {
        "formats": [
            {"id": f.value, "name": f.value.upper(), "extension": f.value}
            for f in ReportFormat
        ]
    }
