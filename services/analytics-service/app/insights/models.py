from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class InsightType(str, Enum):
    """洞察类型"""
    GROWTH = "growth"                    # 增长趋势
    ANOMALY = "anomaly"                  # 异常检测
    PATTERN = "pattern"                  # 规律发现
    COMPARISON = "comparison"            # 对比分析
    PREDICTION = "prediction"            # 预测
    RECOMMENDATION = "recommendation"    # 建议
    MILESTONE = "milestone"              # 里程碑
    WARNING = "warning"                  # 警告
    OPPORTUNITY = "opportunity"          # 机会发现


class InsightPriority(str, Enum):
    """洞察优先级"""
    CRITICAL = "critical"    # 关键
    HIGH = "high"            # 高
    MEDIUM = "medium"        # 中
    LOW = "low"              # 低


class InsightCategory(str, Enum):
    """洞察分类"""
    TRAFFIC = "traffic"              # 流量
    ENGAGEMENT = "engagement"        # 互动
    CONVERSION = "conversion"        # 转化
    PERFORMANCE = "performance"      # 性能
    AUDIENCE = "audience"            # 受众
    CONTENT = "content"              # 内容
    GEOGRAPHIC = "geographic"        # 地理
    TEMPORAL = "temporal"            # 时间


class StoryTone(str, Enum):
    """故事风格"""
    PROFESSIONAL = "professional"    # 专业正式
    CASUAL = "casual"                # 轻松随意
    ENCOURAGING = "encouraging"      # 鼓励积极
    ANALYTICAL = "analytical"        # 分析客观
    EXECUTIVE = "executive"          # 高管简报


class DataPoint(BaseModel):
    """数据点"""
    metric: str
    value: float
    previous_value: Optional[float] = None
    change_percent: Optional[float] = None
    timestamp: Optional[datetime] = None


class Insight(BaseModel):
    """单个洞察"""
    id: str
    type: InsightType
    category: InsightCategory
    priority: InsightPriority
    title: str
    summary: str
    details: str
    data_points: List[DataPoint] = []
    supporting_data: Dict[str, Any] = {}
    action_items: List[str] = []
    confidence: float = Field(ge=0, le=1, default=0.8)
    created_at: datetime = Field(default_factory=datetime.now)


class DataStory(BaseModel):
    """数据故事"""
    id: str
    team_id: str
    title: str
    subtitle: Optional[str] = None
    executive_summary: str
    key_metrics: List[DataPoint]
    insights: List[Insight]
    narrative: str                    # 完整叙事文本
    highlights: List[str]             # 亮点摘要
    concerns: List[str]               # 关注点
    recommendations: List[str]        # 建议
    period_start: datetime
    period_end: datetime
    tone: StoryTone = StoryTone.PROFESSIONAL
    generated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = {}


class StoryRequest(BaseModel):
    """故事生成请求"""
    team_id: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    focus_areas: List[InsightCategory] = []
    tone: StoryTone = StoryTone.PROFESSIONAL
    include_predictions: bool = True
    include_recommendations: bool = True
    max_insights: int = Field(default=10, ge=1, le=50)
    language: str = "zh"              # 支持 zh, en


class TrendAnalysis(BaseModel):
    """趋势分析"""
    metric: str
    direction: str                    # up, down, stable
    magnitude: float                  # 变化幅度百分比
    significance: str                 # significant, moderate, minor
    period_comparison: str            # 与什么期间对比
    data_series: List[Dict[str, Any]] = []


class AnomalyDetection(BaseModel):
    """异常检测结果"""
    metric: str
    anomaly_type: str                 # spike, drop, pattern_break
    severity: str                     # high, medium, low
    detected_at: datetime
    expected_value: float
    actual_value: float
    deviation_percent: float
    possible_causes: List[str] = []


class PerformanceSnapshot(BaseModel):
    """性能快照"""
    total_clicks: int
    total_links: int
    unique_visitors: int
    avg_ctr: float
    top_performing_link: Optional[Dict[str, Any]] = None
    worst_performing_link: Optional[Dict[str, Any]] = None
    growth_rate: float
    period: str


class AudienceProfile(BaseModel):
    """受众画像"""
    top_countries: List[Dict[str, Any]]
    top_cities: List[Dict[str, Any]]
    device_breakdown: Dict[str, float]
    browser_breakdown: Dict[str, float]
    peak_hours: List[int]
    peak_days: List[str]


class ContentAnalysis(BaseModel):
    """内容分析"""
    most_clicked_categories: List[Dict[str, Any]]
    best_performing_domains: List[Dict[str, Any]]
    avg_link_lifespan: float         # 链接平均活跃天数
    viral_potential_score: float     # 病毒传播潜力评分


class WeeklyDigest(BaseModel):
    """每周摘要"""
    week_number: int
    year: int
    team_id: str
    story: DataStory
    week_over_week_change: Dict[str, float]
    notable_events: List[str]
    goals_progress: List[Dict[str, Any]]


class MonthlyReport(BaseModel):
    """月度报告"""
    month: int
    year: int
    team_id: str
    story: DataStory
    month_over_month_change: Dict[str, float]
    quarterly_progress: float
    seasonal_insights: List[str]


class InsightTemplate(BaseModel):
    """洞察模板"""
    id: str
    type: InsightType
    title_template: str
    summary_template: str
    details_template: str
    variables: List[str]
    min_confidence: float = 0.7
