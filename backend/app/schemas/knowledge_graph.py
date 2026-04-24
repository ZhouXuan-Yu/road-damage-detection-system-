from typing import Optional
from pydantic import BaseModel, Field


class GraphEntityCreate(BaseModel):
    name: str = Field(..., max_length=200)
    entity_type: str = Field(..., max_length=50)
    code: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = None
    properties: Optional[dict] = None
    severity_level: Optional[str] = None
    priority: int = Field(default=3, ge=1, le=5)
    cost_range: Optional[str] = None
    source_document: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class GraphEntityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    entity_type: Optional[str] = Field(default=None, max_length=50)
    code: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = None
    properties: Optional[dict] = None
    severity_level: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    cost_range: Optional[str] = None
    source_document: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class GraphEntityResponse(BaseModel):
    id: int
    name: str
    entity_type: str
    code: Optional[str] = None
    description: Optional[str] = None
    properties: Optional[dict] = None
    severity_level: Optional[str] = None
    priority: int = 3
    cost_range: Optional[str] = None
    source_document: Optional[str] = None
    confidence: float = 1.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class GraphRelationCreate(BaseModel):
    source_name: str = Field(..., description="源实体名称")
    target_name: str = Field(..., description="目标实体名称")
    relation_type: str = Field(..., max_length=100)
    properties: Optional[dict] = None
    weight: float = Field(default=1.0, ge=0.0, le=1.0)
    source_document: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class GraphRelationResponse(BaseModel):
    id: int
    source_id: int
    target_id: int
    source_name: str
    target_name: str
    relation_type: str
    properties: Optional[dict] = None
    weight: float = 1.0
    source_document: Optional[str] = None
    confidence: float = 1.0
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class KnowledgeDocumentCreate(BaseModel):
    title: str = Field(..., max_length=500)
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    source_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None


class KnowledgeDocumentResponse(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    source_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    status: str
    entity_count: int
    relation_count: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class KnowledgeDocumentListResponse(BaseModel):
    items: list[KnowledgeDocumentResponse]
    total: int


# ========== 图谱 Schema（重构，支持多层级）============

class GraphNodeResponse(BaseModel):
    id: int
    name: str
    entity_type: str
    code: Optional[str] = None
    description: Optional[str] = None
    properties: Optional[dict] = None
    severity_level: Optional[str] = None
    priority: int = 3
    cost_range: Optional[str] = None
    symbolSize: int = 20
    color: Optional[str] = None


class GraphLinkResponse(BaseModel):
    source: int
    target: int
    source_name: str
    target_name: str
    relation_type: str
    weight: float = 1.0
    properties: Optional[dict] = None
    lineStyle: Optional[dict] = None


class GraphResponse(BaseModel):
    nodes: list[GraphNodeResponse]
    links: list[GraphLinkResponse]
    categories: list[dict]
    stats: Optional[dict] = None


class EntityDetailResponse(BaseModel):
    id: int
    name: str
    entity_type: str
    code: Optional[str] = None
    description: Optional[str] = None
    properties: Optional[dict] = None
    severity_level: Optional[str] = None
    priority: int = 3
    cost_range: Optional[str] = None
    incoming_relations: list[GraphRelationResponse] = []
    outgoing_relations: list[GraphRelationResponse] = []
    related_entities: list[GraphEntityResponse] = []


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    entity_type: Optional[str] = None
