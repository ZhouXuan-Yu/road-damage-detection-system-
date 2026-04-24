from typing import Optional
from pydantic import BaseModel


class ReportCreate(BaseModel):
    title: str
    report_type: str  # "pdf", "word", "excel"
    record_ids: Optional[list[int]] = None
    include_ai_analysis: bool = False


class ReportResponse(BaseModel):
    id: int
    title: str
    report_type: str
    file_path: str
    content_summary: Optional[str] = None
    ai_analysis: Optional[str] = None
    is_generated: bool
    created_at: str


class ReportListResponse(BaseModel):
    items: list[ReportResponse]
    total: int
