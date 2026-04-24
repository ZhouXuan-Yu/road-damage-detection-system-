from fastapi import APIRouter, Query, Depends
from sqlalchemy import select, func, and_, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.detection import DetectionRecord, DamageOccurrence
from app.schemas.stats import (
    OverviewResponse,
    DistributionItem,
    StatsDistributionResponse,
    TimelineItem,
    StatsTimelineResponse,
    SeverityItem,
    SeverityResponse,
    TopDamageTypeItem,
    TopDamageTypesResponse,
    WeeklyConfidenceItem,
    ConfidenceTrendResponse,
    CalendarHeatmapItem,
    CalendarHeatmapResponse,
    MonthlyTrendItem,
    MonthlyTrendResponse,
    RepairProgressItem,
    RepairProgressResponse,
)

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(db: AsyncSession = Depends(get_db)):
    total_records_query = select(func.count(DetectionRecord.id))
    total_result = await db.execute(total_records_query)
    total_records = total_result.scalar() or 0

    image_query = select(func.count(DetectionRecord.id)).where(
        DetectionRecord.file_type == "image"
    )
    image_result = await db.execute(image_query)
    total_images = image_result.scalar() or 0

    video_query = select(func.count(DetectionRecord.id)).where(
        DetectionRecord.file_type == "video"
    )
    video_result = await db.execute(video_query)
    total_videos = video_result.scalar() or 0

    count_query = select(func.sum(DetectionRecord.total_count))
    count_result = await db.execute(count_query)
    total_detections = count_result.scalar() or 0

    avg_query = select(func.avg(DetectionRecord.avg_confidence))
    avg_result = await db.execute(avg_query)
    avg_confidence = float(avg_result.scalar() or 0)

    return OverviewResponse(
        total_records=total_records,
        total_detections=total_detections,
        total_images=total_images,
        total_videos=total_videos,
        avg_confidence=round(avg_confidence, 4),
        detection_trend=[],
    )


@router.get("/distribution", response_model=StatsDistributionResponse)
async def get_distribution(db: AsyncSession = Depends(get_db)):
    query = select(
        DamageOccurrence.class_name,
        func.count(DamageOccurrence.id).label("count"),
    ).group_by(DamageOccurrence.class_name)

    result = await db.execute(query)
    rows = result.all()

    total = sum(r.count for r in rows)
    items = [
        DistributionItem(
            name=r.class_name,
            value=r.count,
            percentage=round(r.count / total * 100, 2) if total > 0 else 0,
        )
        for r in rows
    ]

    return StatsDistributionResponse(items=items)


@router.get("/timeline", response_model=StatsTimelineResponse)
async def get_timeline(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(days=days)

    query = (
        select(
            func.date(DetectionRecord.created_at).label("date"),
            func.count(DetectionRecord.id).label("count"),
        )
        .where(DetectionRecord.created_at >= cutoff)
        .group_by(func.date(DetectionRecord.created_at))
        .order_by(func.date(DetectionRecord.created_at))
    )

    result = await db.execute(query)
    rows = result.all()

    items = [
        TimelineItem(date=str(r.date), count=r.count)
        for r in rows
    ]

    return StatsTimelineResponse(items=items)


# ========== 新增统计接口 ==========

@router.get("/severity", response_model=SeverityResponse)
async def get_severity_distribution(db: AsyncSession = Depends(get_db)):
    """获取病害严重程度分布"""
    query = (
        select(
            DamageOccurrence.severity,
            func.count(DamageOccurrence.id).label("count"),
        )
        .where(DamageOccurrence.severity.isnot(None))
        .group_by(DamageOccurrence.severity)
        .order_by(func.count(DamageOccurrence.id).desc())
    )
    result = await db.execute(query)
    rows = result.all()

    total = sum(r.count for r in rows)
    items = [
        SeverityItem(
            severity=r.severity or "未知",
            count=r.count,
            percentage=round(r.count / total * 100, 2) if total > 0 else 0,
        )
        for r in rows
    ]

    return SeverityResponse(items=items, total=total)


@router.get("/top-damage-types", response_model=TopDamageTypesResponse)
async def get_top_damage_types(
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """获取 Top N 高发病害类型"""
    query = (
        select(
            DamageOccurrence.class_name,
            func.count(DamageOccurrence.id).label("count"),
        )
        .group_by(DamageOccurrence.class_name)
        .order_by(func.count(DamageOccurrence.id).desc())
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    total = sum(r.count for r in rows)
    items = [
        TopDamageTypeItem(
            class_name=r.class_name,
            count=r.count,
            percentage=round(r.count / total * 100, 2) if total > 0 else 0,
        )
        for r in rows
    ]

    return TopDamageTypesResponse(items=items, total=total)


@router.get("/confidence-trend", response_model=ConfidenceTrendResponse)
async def get_confidence_trend(
    weeks: int = Query(default=12, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
):
    """获取平均置信度周趋势（使用 Python 聚合，兼容 SQLite）"""
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(weeks=weeks)

    query = (
        select(
            DetectionRecord.created_at,
            DetectionRecord.avg_confidence,
        )
        .where(DetectionRecord.created_at >= cutoff)
        .order_by(DetectionRecord.created_at)
    )

    result = await db.execute(query)
    records = result.all()

    # Python 端按周聚合
    from collections import defaultdict

    weekly_data = defaultdict(lambda: {"total": 0.0, "count": 0})
    for r in records:
        if r.created_at and r.avg_confidence is not None:
            # 计算所在周的周一
            weekday = r.created_at.weekday()
            week_start = r.created_at - timedelta(days=weekday)
            week_key = week_start.strftime("%Y-%m-%d")
            weekly_data[week_key]["total"] += r.avg_confidence
            weekly_data[week_key]["count"] += 1

    items = [
        WeeklyConfidenceItem(
            week=week,
            avg_confidence=round(data["total"] / data["count"], 4) if data["count"] > 0 else 0,
            count=data["count"],
        )
        for week, data in sorted(weekly_data.items())
    ]

    return ConfidenceTrendResponse(items=items)


@router.get("/calendar-heatmap", response_model=CalendarHeatmapResponse)
async def get_calendar_heatmap(
    year: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取日历热力图数据"""
    from datetime import datetime

    if year is None:
        year = datetime.utcnow().year

    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"

    query = (
        select(
            func.date(DetectionRecord.created_at).label("date"),
            func.count(DetectionRecord.id).label("count"),
        )
        .where(
            and_(
                DetectionRecord.created_at >= start_date,
                DetectionRecord.created_at <= end_date,
            )
        )
        .group_by(func.date(DetectionRecord.created_at))
        .order_by(func.date(DetectionRecord.created_at))
    )

    result = await db.execute(query)
    rows = result.all()

    # 计算热力等级 (0=无, 1=低, 2=中, 3=高)
    max_count = max((r.count for r in rows), default=1)

    def get_level(c: int) -> int:
        if c == 0:
            return 0
        ratio = c / max_count
        if ratio <= 0.25:
            return 1
        elif ratio <= 0.5:
            return 2
        return 3

    items = [
        CalendarHeatmapItem(
            date=str(r.date),
            count=r.count,
            level=get_level(r.count),
        )
        for r in rows
    ]

    return CalendarHeatmapResponse(items=items, year=year)


@router.get("/monthly-trend", response_model=MonthlyTrendResponse)
async def get_monthly_trend(
    months: int = Query(default=12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    """获取月度检测趋势（使用 Python 聚合，兼容 SQLite）"""
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(days=months * 30)

    query = (
        select(
            DetectionRecord.created_at,
            DetectionRecord.file_type,
        )
        .where(DetectionRecord.created_at >= cutoff)
        .order_by(DetectionRecord.created_at)
    )

    result = await db.execute(query)
    records = result.all()

    # Python 端按月聚合
    from collections import defaultdict

    monthly_data = defaultdict(lambda: {"images": 0, "videos": 0, "total": 0})
    for r in records:
        if r.created_at:
            month_key = r.created_at.strftime("%Y-%m")
            monthly_data[month_key]["total"] += 1
            if r.file_type == "image":
                monthly_data[month_key]["images"] += 1
            elif r.file_type == "video":
                monthly_data[month_key]["videos"] += 1

    items = [
        MonthlyTrendItem(
            month=month,
            images=data["images"],
            videos=data["videos"],
            total=data["total"],
        )
        for month, data in sorted(monthly_data.items())
    ]

    return MonthlyTrendResponse(items=items)


@router.get("/repair-progress", response_model=RepairProgressResponse)
async def get_repair_progress(db: AsyncSession = Depends(get_db)):
    """获取修复进度统计（基于严重程度）"""
    query = (
        select(
            DamageOccurrence.severity,
            func.count(DamageOccurrence.id).label("count"),
        )
        .group_by(DamageOccurrence.severity)
    )

    result = await db.execute(query)
    rows = result.all()

    total = sum(r.count for r in rows)
    repaired = sum(
        r.count for r in rows if r.severity and r.severity.lower() in ["low", "轻度"]
    )
    pending = total - repaired

    items = [
        RepairProgressItem(
            status=r.severity or "未知",
            count=r.count,
            percentage=round(r.count / total * 100, 2) if total > 0 else 0,
        )
        for r in rows
    ]

    return RepairProgressResponse(
        items=items,
        total=total,
        repaired_count=repaired,
        pending_count=pending,
    )
