import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    report_type: Mapped[str] = mapped_column(String(20))
    file_path: Mapped[str] = mapped_column(String(1000))
    content_summary: Mapped[Text] = mapped_column(Text, nullable=True)
    ai_analysis: Mapped[Text] = mapped_column(Text, nullable=True)
    is_generated: Mapped[bool] = mapped_column(default=False)

    record_ids: Mapped[String] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
