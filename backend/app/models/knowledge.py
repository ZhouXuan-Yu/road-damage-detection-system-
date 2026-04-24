import datetime

from sqlalchemy import String, Integer, Text, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DiseaseKnowledge(Base):
    """病害知识库表"""
    __tablename__ = "disease_knowledge"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # D00, D10...
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(20), default="Disease")  # Disease, Obstacle
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # 成因（JSON 数组）
    causes: Mapped[str] = mapped_column(JSON, nullable=True)

    # 各严重程度描述
    severity_low: Mapped[str] = mapped_column(Text, nullable=True)
    severity_medium: Mapped[str] = mapped_column(Text, nullable=True)
    severity_high: Mapped[str] = mapped_column(Text, nullable=True)

    # 修复方法（JSON 数组，包含 method, description, cost, time）
    repair_methods: Mapped[str] = mapped_column(JSON, nullable=True)

    # 关联病害编码（JSON 数组）
    related_codes: Mapped[str] = mapped_column(JSON, nullable=True)

    # 示例图片 URL（JSON 数组）
    image_urls: Mapped[str] = mapped_column(JSON, nullable=True)

    # 预估费用范围
    cost_range: Mapped[str] = mapped_column(String(100), nullable=True)

    # 优先修复级别（1-5，数字越大越优先）
    priority: Mapped[int] = mapped_column(Integer, default=3)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )
