from typing import Optional
from pydantic import BaseModel, Field


class DiseaseKnowledgeBase(BaseModel):
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=100)
    type: str = Field(default="Disease", max_length=20)
    description: Optional[str] = None
    causes: Optional[list[dict]] = None
    severity_low: Optional[str] = None
    severity_medium: Optional[str] = None
    severity_high: Optional[str] = None
    repair_methods: Optional[list[dict]] = None
    related_codes: Optional[list[str]] = None
    image_urls: Optional[list[str]] = None
    cost_range: Optional[str] = None
    priority: int = Field(default=3, ge=1, le=5)


class DiseaseKnowledgeCreate(DiseaseKnowledgeBase):
    pass


class DiseaseKnowledgeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    type: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    causes: Optional[list[dict]] = None
    severity_low: Optional[str] = None
    severity_medium: Optional[str] = None
    severity_high: Optional[str] = None
    repair_methods: Optional[list[dict]] = None
    related_codes: Optional[list[str]] = None
    image_urls: Optional[list[str]] = None
    cost_range: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)


class DiseaseKnowledgeResponse(DiseaseKnowledgeBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DiseaseKnowledgeListResponse(BaseModel):
    items: list[DiseaseKnowledgeResponse]
    total: int


# ========== 图谱 Schema ==========

class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str] = None
    color: Optional[str] = None


class GraphLink(BaseModel):
    source: str
    target: str
    type: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


class DiseaseDetailResponse(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str] = None
    causes: list[dict] = []
    severity_low: Optional[str] = None
    severity_medium: Optional[str] = None
    severity_high: Optional[str] = None
    repair_methods: list[dict] = []
    related_codes: list[str] = []
    affected_components: list[dict] = []
