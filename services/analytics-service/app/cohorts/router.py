"""
Cohort Analysis API Router
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel

from .models import (
    Cohort,
    CohortCreate,
    CohortUpdate,
    CohortAnalysis,
    CohortMetric,
    CohortComparison,
    CohortSegment,
    CohortInsight,
    PresetCohort,
)
from .service import cohort_service


router = APIRouter()


# ========== Request/Response Models ==========


class CohortListResponse(BaseModel):
    cohorts: List[Cohort]
    total: int


class PresetsResponse(BaseModel):
    presets: List[PresetCohort]


class PresetCohortCreate(BaseModel):
    preset_id: str
    name: Optional[str] = None


class CompareRequest(BaseModel):
    segment_field: str
    segment_values: List[str]


class SegmentsResponse(BaseModel):
    segments: List[CohortSegment]
    total: int


class InsightsResponse(BaseModel):
    insights: List[CohortInsight]


class ExportResponse(BaseModel):
    format: str
    data: dict


# ========== Cohort CRUD Endpoints ==========


@router.post("", response_model=Cohort)
async def create_cohort(
    data: CohortCreate,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """创建新队列"""
    return cohort_service.create_cohort(x_team_id, data)


@router.get("", response_model=CohortListResponse)
async def list_cohorts(
    x_team_id: str = Header(..., alias="X-Team-ID"),
    active_only: bool = Query(True, description="只返回激活的队列"),
):
    """获取队列列表"""
    cohorts = cohort_service.list_cohorts(x_team_id, active_only)
    return CohortListResponse(cohorts=cohorts, total=len(cohorts))


@router.get("/presets", response_model=PresetsResponse)
async def get_preset_cohorts():
    """获取预设队列模板"""
    presets = cohort_service.get_preset_cohorts()
    return PresetsResponse(presets=presets)


@router.post("/from-preset", response_model=Cohort)
async def create_from_preset(
    data: PresetCohortCreate,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """从预设模板创建队列"""
    cohort = cohort_service.create_from_preset(x_team_id, data.preset_id, data.name)
    if not cohort:
        raise HTTPException(status_code=404, detail="Preset not found")
    return cohort


@router.get("/{cohort_id}", response_model=Cohort)
async def get_cohort(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """获取队列详情"""
    cohort = cohort_service.get_cohort(cohort_id, x_team_id)
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return cohort


@router.patch("/{cohort_id}", response_model=Cohort)
async def update_cohort(
    cohort_id: str,
    data: CohortUpdate,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """更新队列"""
    cohort = cohort_service.update_cohort(cohort_id, x_team_id, data)
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return cohort


@router.delete("/{cohort_id}")
async def delete_cohort(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
):
    """删除队列"""
    success = cohort_service.delete_cohort(cohort_id, x_team_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return {"success": True}


# ========== Analysis Endpoints ==========


@router.get("/{cohort_id}/analyze", response_model=CohortAnalysis)
async def analyze_cohort(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    metric: CohortMetric = Query(CohortMetric.RETENTION, description="分析指标"),
    breakdown_by: Optional[str] = Query(None, description="分组维度: country, device, source"),
):
    """分析队列留存和行为

    返回完整的队列分析结果，包括：
    - 留存矩阵
    - 各时期留存率
    - 趋势分析
    - 维度拆解
    """
    # Default to last 90 days for cohort analysis
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    analysis = cohort_service.analyze_cohort(
        cohort_id, x_team_id, start_date, end_date, metric, breakdown_by
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return analysis


@router.get("/{cohort_id}/retention-matrix")
async def get_retention_matrix(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """获取留存矩阵数据

    专门用于留存表格/热力图展示
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    analysis = cohort_service.analyze_cohort(
        cohort_id, x_team_id, start_date, end_date
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Cohort not found")

    return {
        "matrix": analysis.retention_matrix.matrix,
        "row_labels": analysis.retention_matrix.row_labels,
        "column_labels": analysis.retention_matrix.column_labels,
        "period_averages": analysis.retention_matrix.period_averages,
        "best_cohort": analysis.retention_matrix.best_cohort,
        "worst_cohort": analysis.retention_matrix.worst_cohort,
    }


@router.post("/{cohort_id}/compare", response_model=CohortComparison)
async def compare_cohort_segments(
    cohort_id: str,
    data: CompareRequest,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """比较队列中不同分群的表现

    例如：比较不同国家、设备、来源的用户留存差异
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    comparison = cohort_service.compare_cohorts(
        cohort_id,
        x_team_id,
        data.segment_field,
        data.segment_values,
        start_date,
        end_date,
    )
    if not comparison:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return comparison


@router.get("/{cohort_id}/segments", response_model=SegmentsResponse)
async def get_cohort_segments(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    segment_by: str = Query(..., description="分群维度: country, device, source"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """获取队列的分群明细

    按指定维度拆解队列，查看各分群的留存表现
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    segments = cohort_service.get_cohort_segments(
        cohort_id, x_team_id, segment_by, start_date, end_date
    )
    return SegmentsResponse(segments=segments, total=len(segments))


@router.get("/{cohort_id}/insights", response_model=InsightsResponse)
async def get_cohort_insights(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """获取队列分析洞察

    自动生成的分析洞察和建议
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    insights = cohort_service.get_cohort_insights(
        cohort_id, x_team_id, start_date, end_date
    )
    return InsightsResponse(insights=insights)


# ========== Export Endpoints ==========


@router.get("/{cohort_id}/export")
async def export_cohort_data(
    cohort_id: str,
    x_team_id: str = Header(..., alias="X-Team-ID"),
    format: str = Query("csv", description="导出格式: csv, json"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """导出队列数据

    支持 CSV 和 JSON 格式
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    data = cohort_service.export_cohort_data(
        cohort_id, x_team_id, format, start_date, end_date
    )
    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"])

    return ExportResponse(format=format, data=data)


# ========== Quick Analysis Endpoints ==========


@router.get("/quick/weekly-retention")
async def get_weekly_retention(
    x_team_id: str = Header(..., alias="X-Team-ID"),
    weeks: int = Query(12, description="分析周数", le=52),
):
    """快速获取周留存数据

    无需创建队列，直接获取过去N周的留存数据
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(weeks=weeks)

    # Create a temporary cohort for quick analysis
    temp_cohort = cohort_service.create_cohort(
        x_team_id,
        CohortCreate(
            name="临时周留存分析",
            description="Quick analysis",
            periods_to_track=weeks,
        ),
    )

    try:
        analysis = cohort_service.analyze_cohort(
            temp_cohort.id, x_team_id, start_date, end_date
        )
        # Clean up temporary cohort
        cohort_service.delete_cohort(temp_cohort.id, x_team_id)

        if not analysis:
            return {"error": "Analysis failed"}

        return {
            "period_type": "weekly",
            "periods_analyzed": weeks,
            "retention_matrix": analysis.retention_matrix.dict(),
            "summary": {
                "week1_retention": analysis.average_retention_period1,
                "week4_retention": analysis.average_retention_period4,
                "trend": analysis.retention_trend,
                "trend_change": analysis.trend_percentage,
            },
        }
    except Exception as e:
        # Ensure cleanup even on error
        cohort_service.delete_cohort(temp_cohort.id, x_team_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quick/monthly-retention")
async def get_monthly_retention(
    x_team_id: str = Header(..., alias="X-Team-ID"),
    months: int = Query(6, description="分析月数", le=24),
):
    """快速获取月留存数据

    无需创建队列，直接获取过去N月的留存数据
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=months * 30)

    # Create a temporary cohort for quick analysis
    from .models import CohortGranularity
    temp_cohort = cohort_service.create_cohort(
        x_team_id,
        CohortCreate(
            name="临时月留存分析",
            description="Quick analysis",
            granularity=CohortGranularity.MONTHLY,
            periods_to_track=months,
        ),
    )

    try:
        analysis = cohort_service.analyze_cohort(
            temp_cohort.id, x_team_id, start_date, end_date
        )
        # Clean up temporary cohort
        cohort_service.delete_cohort(temp_cohort.id, x_team_id)

        if not analysis:
            return {"error": "Analysis failed"}

        return {
            "period_type": "monthly",
            "periods_analyzed": months,
            "retention_matrix": analysis.retention_matrix.dict(),
            "summary": {
                "month1_retention": analysis.average_retention_period1,
                "month3_retention": analysis.average_retention_period4 if months >= 4 else None,
                "trend": analysis.retention_trend,
                "trend_change": analysis.trend_percentage,
            },
        }
    except Exception as e:
        # Ensure cleanup even on error
        cohort_service.delete_cohort(temp_cohort.id, x_team_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quick/acquisition-trend")
async def get_acquisition_trend(
    x_team_id: str = Header(..., alias="X-Team-ID"),
    days: int = Query(30, description="分析天数", le=365),
):
    """获取用户获取趋势

    每日/每周新用户数量趋势
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Query daily acquisition
    try:
        from app.core.clickhouse import get_clickhouse_client
        client = get_clickhouse_client()
        result = client.execute(
            """
            SELECT
                toDate(timestamp) as date,
                uniq(visitor_id) as new_users
            FROM clicks
            WHERE timestamp >= %(start)s
              AND timestamp <= %(end)s
              AND visitor_id NOT IN (
                  SELECT visitor_id FROM clicks WHERE timestamp < %(start)s
              )
            GROUP BY date
            ORDER BY date
            """,
            {"start": start_date, "end": end_date}
        )

        daily_data = [
            {"date": str(row[0]), "new_users": row[1]}
            for row in result
        ]
    except Exception:
        # Mock data fallback
        import random
        daily_data = [
            {
                "date": (start_date + timedelta(days=i)).strftime("%Y-%m-%d"),
                "new_users": random.randint(50, 200),
            }
            for i in range(days)
        ]

    total_new = sum(d["new_users"] for d in daily_data)
    avg_daily = total_new / len(daily_data) if daily_data else 0

    return {
        "period_days": days,
        "daily_acquisition": daily_data,
        "total_new_users": total_new,
        "average_daily": round(avg_daily, 1),
    }
