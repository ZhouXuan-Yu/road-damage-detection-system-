from typing import Optional
from pydantic import BaseModel


class OverviewResponse(BaseModel):
    total_records: int
    total_detections: int
    total_images: int
    total_videos: int
    avg_confidence: float
    detection_trend: list[dict]


class DistributionItem(BaseModel):
    name: str
    value: int
    percentage: float


class StatsDistributionResponse(BaseModel):
    items: list[DistributionItem]


class TimelineItem(BaseModel):
    date: str
    count: int


class StatsTimelineResponse(BaseModel):
    items: list[TimelineItem]


# --- 新增 Schema ---

class SeverityItem(BaseModel):
    severity: str
    count: int
    percentage: float


class SeverityResponse(BaseModel):
    items: list[SeverityItem]
    total: int


class TopDamageTypeItem(BaseModel):
    class_name: str
    count: int
    percentage: float


class TopDamageTypesResponse(BaseModel):
    items: list[TopDamageTypeItem]
    total: int


class WeeklyConfidenceItem(BaseModel):
    week: str
    avg_confidence: float
    count: int


class ConfidenceTrendResponse(BaseModel):
    items: list[WeeklyConfidenceItem]


class CalendarHeatmapItem(BaseModel):
    date: str
    count: int
    level: int  # 0=无, 1=低, 2=中, 3=高


class CalendarHeatmapResponse(BaseModel):
    items: list[CalendarHeatmapItem]
    year: int


class MonthlyTrendItem(BaseModel):
    month: str
    images: int
    videos: int
    total: int


class MonthlyTrendResponse(BaseModel):
    items: list[MonthlyTrendItem]


class RepairProgressItem(BaseModel):
    status: str
    count: int
    percentage: float


class RepairProgressResponse(BaseModel):
    items: list[RepairProgressItem]
    total: int
    repaired_count: int
    pending_count: int
