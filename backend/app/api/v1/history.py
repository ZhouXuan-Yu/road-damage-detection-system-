from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.detection import DetectionRecord
from app.schemas.history import HistoryItem, HistoryListResponse

router = APIRouter(prefix="/history", tags=["History"])


@router.get("", response_model=HistoryListResponse)
async def list_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    file_type: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if file_type:
        filters.append(DetectionRecord.file_type == file_type)
    if search:
        filters.append(DetectionRecord.filename.contains(search))

    where = and_(*filters) if filters else True

    count_query = select(func.count(DetectionRecord.id)).where(where)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = (
        select(DetectionRecord)
        .where(where)
        .order_by(DetectionRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    items = [
        HistoryItem(
            id=r.id,
            filename=r.filename,
            file_type=r.file_type,
            total_count=r.total_count,
            avg_confidence=r.avg_confidence,
            detection_data=None,
            thumbnail_path=f"/static/results/{r.thumbnail_path}" if r.thumbnail_path else None,
            result_path=f"/static/results/{r.result_path}" if r.result_path else None,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return HistoryListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{record_id}")
async def get_history_detail(record_id: int, db: AsyncSession = Depends(get_db)):
    query = select(DetectionRecord).where(DetectionRecord.id == record_id)
    result = await db.execute(query)
    record = result.scalar_one_or_none()

    if not record:
        from fastapi import HTTPException
        raise HTTPException(404, "Record not found")

    return {
        "id": record.id,
        "filename": record.filename,
        "file_type": record.file_type,
        "original_path": record.original_path,
        "result_path": f"/static/results/{record.result_path}" if record.result_path else None,
        "thumbnail_path": f"/static/results/{record.thumbnail_path}" if record.thumbnail_path else None,
        "total_count": record.total_count,
        "avg_confidence": record.avg_confidence,
        "frame_count": record.frame_count,
        "detection_data": record.detection_data,
        "confidence": record.confidence,
        "iou_threshold": record.iou_threshold,
        "created_at": record.created_at.isoformat() if record.created_at else "",
    }
