import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DetectionRecord(Base):
    __tablename__ = "detection_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(20))  # "image" or "video"
    original_path: Mapped[str] = mapped_column(String(1000))
    result_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    confidence: Mapped[float] = mapped_column(Float)
    iou_threshold: Mapped[float] = mapped_column(Float)

    total_count: Mapped[int] = mapped_column(Integer, default=0)
    detection_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    frame_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    occurrences: Mapped[list["DamageOccurrence"]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )


class DamageOccurrence(Base):
    __tablename__ = "damage_occurrences"

    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("detection_records.id"))
    class_name: Mapped[str] = mapped_column(String(50))
    class_code: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[float] = mapped_column(Float)
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    bbox_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bbox_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bbox_w: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bbox_h: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    frame_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    record: Mapped["DetectionRecord"] = relationship(back_populates="occurrences")
