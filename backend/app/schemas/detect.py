from typing import Optional
from pydantic import BaseModel, Field


class DamageItem(BaseModel):
    class_name: str
    class_code: str
    confidence: float
    severity: Optional[str] = None
    bbox_x: Optional[float] = None
    bbox_y: Optional[float] = None
    bbox_w: Optional[float] = None
    bbox_h: Optional[float] = None
    frame_index: Optional[int] = None


class DetectionResponse(BaseModel):
    record_id: int
    filename: str
    file_type: str
    result_path: str
    thumbnail_path: Optional[str] = None
    total_count: int
    avg_confidence: float
    frame_count: Optional[int] = None
    detection_data: dict[str, int]
    damages: list[DamageItem]
    created_at: str


class VideoTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str


class DetectionParams(BaseModel):
    confidence: float = Field(default=0.25, ge=0.01, le=0.99)
    iou: float = Field(default=0.45, ge=0.01, le=0.99)


class DetectionStats(BaseModel):
    total_detections: int
    avg_confidence: float
    damage_distribution: dict[str, int]
    top_damages: list[dict[str, str | int]]
