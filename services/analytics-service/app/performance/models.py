from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class MetricType(str, Enum):
    REDIRECT_LATENCY = "redirect_latency"       # 重定向延迟
    CLICK_RATE = "click_rate"                   # 点击率
    ERROR_RATE = "error_rate"                   # 错误率
    THROUGHPUT = "throughput"                   # 吞吐量
    AVAILABILITY = "availability"              # 可用性
    RESPONSE_TIME = "response_time"            # 响应时间
    CACHE_HIT_RATE = "cache_hit_rate"          # 缓存命中率


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class TimeGranularity(str, Enum):
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"


class PerformanceMetric(BaseModel):
    """性能指标数据点"""
    timestamp: datetime
    metric_type: MetricType
    value: float
    unit: str
    tags: Dict[str, str] = Field(default_factory=dict)


class PerformanceThreshold(BaseModel):
    """性能阈值配置"""
    metric_type: MetricType
    warning_threshold: float
    critical_threshold: float
    operator: str = "gt"  # gt, lt, gte, lte
    enabled: bool = True


class PerformanceAlert(BaseModel):
    """性能告警"""
    id: str
    timestamp: datetime
    metric_type: MetricType
    current_value: float
    threshold_value: float
    severity: AlertSeverity
    message: str
    team_id: Optional[str] = None
    link_id: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class ServiceHealthStatus(BaseModel):
    """服务健康状态"""
    service_name: str
    status: str  # healthy, degraded, unhealthy
    uptime_percentage: float
    avg_response_time_ms: float
    error_rate: float
    last_check: datetime
    details: Dict[str, Any] = Field(default_factory=dict)


class RedirectPerformance(BaseModel):
    """重定向性能统计"""
    total_redirects: int
    avg_latency_ms: float
    p50_latency_ms: float
    p90_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float
    min_latency_ms: float
    error_count: int
    error_rate: float
    cache_hit_rate: float
    timestamp: datetime


class PerformanceQuery(BaseModel):
    """性能查询参数"""
    team_id: Optional[str] = None
    link_id: Optional[str] = None
    metric_types: Optional[List[MetricType]] = None
    start_date: datetime
    end_date: datetime
    granularity: TimeGranularity = TimeGranularity.HOUR


class PerformanceSummary(BaseModel):
    """性能摘要"""
    period_start: datetime
    period_end: datetime
    total_requests: int
    avg_response_time_ms: float
    p95_response_time_ms: float
    error_rate: float
    availability: float
    cache_hit_rate: float
    throughput_per_second: float
    top_slowest_links: List[Dict[str, Any]]
    top_error_links: List[Dict[str, Any]]
    geo_latency: Dict[str, float]


class PerformanceReport(BaseModel):
    """性能报告"""
    id: str
    team_id: str
    name: str
    created_at: datetime
    period_start: datetime
    period_end: datetime
    summary: PerformanceSummary
    metrics: List[PerformanceMetric]
    alerts: List[PerformanceAlert]
    recommendations: List[str]


class PerformanceTrend(BaseModel):
    """性能趋势"""
    metric_type: MetricType
    current_value: float
    previous_value: float
    change_percentage: float
    trend: str  # improving, degrading, stable
    data_points: List[Dict[str, Any]]


class SystemPerformance(BaseModel):
    """系统整体性能"""
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]
    active_connections: int
    queue_depth: int
    services: List[ServiceHealthStatus]
