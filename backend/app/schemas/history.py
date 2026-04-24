from typing import Optional
from pydantic import BaseModel


class HistoryItem(BaseModel):
    id: int
    filename: str
    file_type: str
    total_count: int
    avg_confidence: float
    detection_data: Optional[dict] = None
    thumbnail_path: Optional[str] = None
    result_path: Optional[str] = None
    created_at: str


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    page: int
    limit: int
    total_pages: int


class HistoryFilter(BaseModel):
    page: int = 1
    limit: int = 20
    file_type: Optional[str] = None
    search: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
