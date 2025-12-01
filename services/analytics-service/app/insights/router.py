from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException

from .models import (
    StoryRequest, DataStory, Insight, StoryTone, InsightCategory,
    WeeklyDigest, MonthlyReport
)
from .service import insights_service

router = APIRouter()


@router.post("/story", response_model=DataStory)
async def generate_data_story(request: StoryRequest):
    """
    生成数据故事

    根据指定的时间范围和参数，自动生成包含洞察、趋势分析和建议的数据故事。
    """
    try:
        story = await insights_service.generate_story(request)
        return story
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/story/{team_id}", response_model=DataStory)
async def get_data_story(
    team_id: str,
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
    tone: StoryTone = Query(StoryTone.PROFESSIONAL, description="叙事风格"),
    language: str = Query("zh", description="语言 (zh/en)"),
    include_recommendations: bool = Query(True, description="是否包含建议"),
):
    """
    获取数据故事（GET 方式）
    """
    request = StoryRequest(
        team_id=team_id,
        period_start=start_date,
        period_end=end_date,
        tone=tone,
        language=language,
        include_recommendations=include_recommendations
    )
    return await insights_service.generate_story(request)


@router.get("/quick/{team_id}", response_model=List[Insight])
async def get_quick_insights(
    team_id: str,
    limit: int = Query(5, ge=1, le=20, description="返回洞察数量"),
):
    """
    获取快速洞察

    用于仪表盘展示的简短洞察列表，基于最近7天的数据。
    """
    return await insights_service.get_quick_insights(team_id, limit)


@router.get("/weekly/{team_id}", response_model=WeeklyDigest)
async def get_weekly_digest(
    team_id: str,
    week: int = Query(..., ge=1, le=53, description="周数"),
    year: int = Query(..., ge=2020, le=2100, description="年份"),
):
    """
    获取每周摘要

    生成指定周的数据摘要报告。
    """
    return await insights_service.get_weekly_digest(team_id, week, year)


@router.get("/monthly/{team_id}", response_model=MonthlyReport)
async def get_monthly_report(
    team_id: str,
    month: int = Query(..., ge=1, le=12, description="月份"),
    year: int = Query(..., ge=2020, le=2100, description="年份"),
):
    """
    获取月度报告

    生成指定月份的完整数据报告。
    """
    return await insights_service.get_monthly_report(team_id, month, year)


@router.get("/trends/{team_id}")
async def get_trend_insights(
    team_id: str,
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """
    获取趋势洞察

    分析数据趋势并返回相关洞察。
    """
    from datetime import timedelta

    end = end_date or datetime.now()
    start = start_date or (end - timedelta(days=30))

    trends = await insights_service._analyze_trends(team_id, start, end)
    return {
        "team_id": team_id,
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat()
        },
        "trends": [t.model_dump() for t in trends]
    }


@router.get("/anomalies/{team_id}")
async def get_anomaly_insights(
    team_id: str,
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """
    获取异常检测结果

    检测数据中的异常模式。
    """
    from datetime import timedelta

    end = end_date or datetime.now()
    start = start_date or (end - timedelta(days=7))

    anomalies = await insights_service._detect_anomalies(team_id, start, end)
    return {
        "team_id": team_id,
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat()
        },
        "anomalies": [a.model_dump() for a in anomalies]
    }


@router.get("/audience/{team_id}")
async def get_audience_insights(
    team_id: str,
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    """
    获取受众洞察

    分析受众特征并返回洞察。
    """
    from datetime import timedelta

    end = end_date or datetime.now()
    start = start_date or (end - timedelta(days=30))

    audience = await insights_service._get_audience_data(team_id, start, end)

    # 生成受众相关洞察
    insights = []

    if audience.top_countries:
        total = sum(c.get("clicks", 0) for c in audience.top_countries)
        if total > 0:
            top = audience.top_countries[0]
            pct = (top.get("clicks", 0) / total) * 100
            insights.append({
                "type": "geographic",
                "title": f"流量主要来自{top.get('country', '未知')}",
                "description": f"{top.get('country', '未知')}贡献了 {pct:.1f}% 的流量",
                "data": audience.top_countries[:5]
            })

    if audience.device_breakdown:
        dominant = max(audience.device_breakdown.items(), key=lambda x: x[1])
        insights.append({
            "type": "device",
            "title": f"{dominant[0]}用户占主导",
            "description": f"{dominant[1]}% 的访问来自{dominant[0]}设备",
            "data": audience.device_breakdown
        })

    if audience.peak_hours:
        insights.append({
            "type": "temporal",
            "title": "流量高峰时段",
            "description": f"高峰时段为 {', '.join(f'{h}:00' for h in audience.peak_hours[:3])}",
            "data": audience.peak_hours
        })

    return {
        "team_id": team_id,
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat()
        },
        "profile": audience.model_dump(),
        "insights": insights
    }


@router.get("/comparison/{team_id}")
async def compare_periods(
    team_id: str,
    period1_start: datetime = Query(..., description="第一期间开始"),
    period1_end: datetime = Query(..., description="第一期间结束"),
    period2_start: datetime = Query(..., description="第二期间开始"),
    period2_end: datetime = Query(..., description="第二期间结束"),
    language: str = Query("zh", description="语言"),
):
    """
    期间对比分析

    对比两个时间段的数据并生成洞察。
    """
    perf1 = await insights_service._get_performance_data(
        team_id, period1_start, period1_end
    )
    perf2 = await insights_service._get_performance_data(
        team_id, period2_start, period2_end
    )

    def calc_change(v1, v2):
        if v1 == 0:
            return 0 if v2 == 0 else 100
        return ((v2 - v1) / v1) * 100

    comparison = {
        "clicks_change": calc_change(perf1.total_clicks, perf2.total_clicks),
        "visitors_change": calc_change(perf1.unique_visitors, perf2.unique_visitors),
        "links_change": calc_change(perf1.total_links, perf2.total_links),
    }

    # 生成对比洞察
    insights = []

    if comparison["clicks_change"] > 20:
        insights.append({
            "type": "growth",
            "priority": "high",
            "title": "显著增长" if language == "zh" else "Significant Growth",
            "description": f"点击量增长了 {comparison['clicks_change']:.1f}%"
        })
    elif comparison["clicks_change"] < -20:
        insights.append({
            "type": "warning",
            "priority": "high",
            "title": "明显下降" if language == "zh" else "Notable Decline",
            "description": f"点击量下降了 {abs(comparison['clicks_change']):.1f}%"
        })

    return {
        "team_id": team_id,
        "period1": {
            "start": period1_start.isoformat(),
            "end": period1_end.isoformat(),
            "performance": perf1.model_dump()
        },
        "period2": {
            "start": period2_start.isoformat(),
            "end": period2_end.isoformat(),
            "performance": perf2.model_dump()
        },
        "comparison": comparison,
        "insights": insights
    }


@router.get("/dashboard/{team_id}")
async def get_insights_dashboard(
    team_id: str,
    language: str = Query("zh", description="语言"),
):
    """
    获取洞察仪表盘数据

    一站式获取所有关键洞察数据，适合仪表盘展示。
    """
    from datetime import timedelta

    now = datetime.now()

    # 获取最近7天的快速洞察
    quick_insights = await insights_service.get_quick_insights(team_id, 5)

    # 获取今日与昨日对比
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    today_perf = await insights_service._get_performance_data(
        team_id, today_start, now
    )
    yesterday_perf = await insights_service._get_performance_data(
        team_id, yesterday_start, today_start
    )

    # 获取本周数据
    week_start = today_start - timedelta(days=today_start.weekday())
    week_perf = await insights_service._get_performance_data(
        team_id, week_start, now
    )

    return {
        "team_id": team_id,
        "generated_at": now.isoformat(),
        "quick_insights": [i.model_dump() for i in quick_insights],
        "today": {
            "performance": today_perf.model_dump(),
            "vs_yesterday": {
                "clicks_change": (
                    ((today_perf.total_clicks - yesterday_perf.total_clicks) / yesterday_perf.total_clicks * 100)
                    if yesterday_perf.total_clicks > 0 else 0
                )
            }
        },
        "this_week": {
            "performance": week_perf.model_dump()
        },
        "highlights": [i.title for i in quick_insights if i.priority in ["high", "critical"]][:3],
        "action_items": list(set(
            item for i in quick_insights for item in i.action_items
        ))[:5]
    }


@router.get("/templates")
async def get_insight_templates():
    """
    获取可用的洞察模板

    返回系统支持的所有洞察类型和模板。
    """
    from .models import InsightType, InsightCategory, InsightPriority, StoryTone

    return {
        "insight_types": [t.value for t in InsightType],
        "categories": [c.value for c in InsightCategory],
        "priorities": [p.value for p in InsightPriority],
        "tones": [t.value for t in StoryTone],
        "supported_languages": ["zh", "en"],
        "features": {
            "trend_analysis": True,
            "anomaly_detection": True,
            "geographic_insights": True,
            "device_insights": True,
            "milestone_detection": True,
            "recommendations": True,
            "period_comparison": True
        }
    }


@router.post("/feedback/{insight_id}")
async def submit_insight_feedback(
    insight_id: str,
    helpful: bool = Query(..., description="洞察是否有帮助"),
    feedback: Optional[str] = Query(None, description="反馈内容"),
):
    """
    提交洞察反馈

    用于收集用户对洞察质量的反馈，帮助改进算法。
    """
    # 存储反馈（实际实现中应保存到数据库）
    return {
        "insight_id": insight_id,
        "feedback_received": True,
        "helpful": helpful,
        "message": "感谢您的反馈！" if helpful else "感谢反馈，我们会继续改进。"
    }


@router.get("/scheduled/{team_id}")
async def get_scheduled_reports(
    team_id: str,
):
    """
    获取已设置的定期报告
    """
    # 返回模拟数据，实际实现需要从数据库读取
    return {
        "team_id": team_id,
        "schedules": [
            {
                "id": "weekly-digest",
                "name": "每周摘要",
                "frequency": "weekly",
                "day": "monday",
                "time": "09:00",
                "enabled": True,
                "recipients": ["team@example.com"]
            },
            {
                "id": "monthly-report",
                "name": "月度报告",
                "frequency": "monthly",
                "day": 1,
                "time": "10:00",
                "enabled": True,
                "recipients": ["team@example.com"]
            }
        ]
    }


@router.post("/scheduled/{team_id}")
async def create_scheduled_report(
    team_id: str,
    name: str = Query(..., description="报告名称"),
    frequency: str = Query(..., description="频率: daily/weekly/monthly"),
    recipients: str = Query(..., description="接收者邮箱，逗号分隔"),
):
    """
    创建定期报告
    """
    import uuid

    return {
        "id": str(uuid.uuid4()),
        "team_id": team_id,
        "name": name,
        "frequency": frequency,
        "recipients": recipients.split(","),
        "created": True,
        "message": f"已创建{frequency}报告: {name}"
    }
