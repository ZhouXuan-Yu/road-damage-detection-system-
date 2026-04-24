"""
知识图谱数据库模型
支持多类型实体节点和多类型关系边
"""

import datetime
from sqlalchemy import String, Integer, Text, JSON, DateTime, Float, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class GraphEntity(Base):
    """知识图谱实体节点表"""
    __tablename__ = "graph_entities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=True, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    properties: Mapped[str] = mapped_column(JSON, nullable=True)
    severity_level: Mapped[str] = mapped_column(String(20), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=3)
    cost_range: Mapped[str] = mapped_column(String(100), nullable=True)
    source_document: Mapped[str] = mapped_column(String(500), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "entity_type": self.entity_type,
            "code": self.code,
            "description": self.description,
            "properties": self.properties or {},
            "severity_level": self.severity_level,
            "priority": self.priority,
            "cost_range": self.cost_range,
            "source_document": self.source_document,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GraphRelation(Base):
    """知识图谱关系边表"""
    __tablename__ = "graph_relations"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey("graph_entities.id"), nullable=False, index=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("graph_entities.id"), nullable=False, index=True)
    relation_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    properties: Mapped[str] = mapped_column(JSON, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    source_document: Mapped[str] = mapped_column(String(500), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    source: Mapped[GraphEntity] = relationship(
        "GraphEntity", foreign_keys=[source_id], lazy="selectin"
    )
    target: Mapped[GraphEntity] = relationship(
        "GraphEntity", foreign_keys=[target_id], lazy="selectin"
    )

    __table_args__ = (
        Index("idx_relation_lookup", "source_id", "target_id"),
    )


class KnowledgeDocument(Base):
    """知识文档表（存储上传的文章/文档）"""
    __tablename__ = "knowledge_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=True)
    file_type: Mapped[str] = mapped_column(String(50), nullable=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    tags: Mapped[str] = mapped_column(JSON, nullable=True)
    embedding: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    entity_count: Mapped[int] = mapped_column(Integer, default=0)
    relation_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )
