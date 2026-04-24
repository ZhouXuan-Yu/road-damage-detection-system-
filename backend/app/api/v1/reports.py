"""
报告管理 API 路由
提供报告的创建、查询、下载、删除等接口
"""

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse, ReportListResponse
from app.services.report_service import create_report

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("", response_model=ReportResponse)
async def create_new_report(
    request: ReportCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    创建新的检测报告
    
    - **title**: 报告标题
    - **report_type**: 报告类型 (pdf/word/excel)
    - **record_ids**: 关联的检测记录ID列表 (可选)
    - **include_ai_analysis**: 是否包含AI分析 (可选)
    """
    if request.report_type not in ("pdf", "word", "excel"):
        raise HTTPException(400, "report_type must be pdf, word, or excel")
    
    try:
        # 确保在同一个会话中执行所有操作
        report = await create_report(
            db=db,
            title=request.title,
            report_type=request.report_type,
            record_ids=request.record_ids,
            include_ai=request.include_ai_analysis,
        )
        
        return ReportResponse(
            id=report.id,
            title=report.title,
            report_type=report.report_type,
            file_path=f"/static/reports/{Path(report.file_path).name}",
            content_summary=report.content_summary,
            ai_analysis=report.ai_analysis,
            is_generated=report.is_generated,
            created_at=report.created_at.isoformat() if report.created_at else "",
        )
    except Exception as e:
        raise HTTPException(500, f"Report creation failed: {str(e)}")


@router.get("", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取报告列表（分页）"""
    count_query = select(func.count(Report.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = (
        select(Report)
        .order_by(Report.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    reports = result.scalars().all()

    items = [
        ReportResponse(
            id=r.id,
            title=r.title,
            report_type=r.report_type,
            file_path=f"/static/reports/{Path(r.file_path).name}",
            content_summary=r.content_summary,
            ai_analysis=r.ai_analysis,
            is_generated=r.is_generated,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in reports
    ]

    return ReportListResponse(items=items, total=total)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个报告详情"""
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(404, "Report not found")

    return ReportResponse(
        id=report.id,
        title=report.title,
        report_type=report.report_type,
        file_path=f"/static/reports/{Path(report.file_path).name}",
        content_summary=report.content_summary,
        ai_analysis=report.ai_analysis,
        is_generated=report.is_generated,
        created_at=report.created_at.isoformat() if report.created_at else "",
    )


@router.get("/{report_id}/download")
async def download_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """下载报告文件"""
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(404, "Report not found")

    file_path = Path(report.file_path)
    if not file_path.exists():
        raise HTTPException(404, "Report file not found")

    content_type_map = {
        "pdf": "application/pdf",
        "word": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    ext_map = {
        "pdf": "pdf",
        "word": "docx",
        "excel": "xlsx",
    }

    content_type = content_type_map.get(report.report_type, "application/octet-stream")
    ext = ext_map.get(report.report_type, "pdf")

    # 生成下载文件名
    download_name = f"{report.title}_{datetime.now().strftime('%Y%m%d')}.{ext}"

    return FileResponse(
        str(file_path),
        media_type=content_type,
        filename=download_name,
    )


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除报告"""
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(404, "Report not found")

    # 删除物理文件
    file_path = Path(report.file_path)
    if file_path.exists():
        file_path.unlink()

    # 删除数据库记录
    await db.delete(report)
    await db.commit()

    return {"message": "Report deleted successfully"}


@router.get("/types/available")
async def get_available_report_types():
    """获取可用的报告类型"""
    return {
        "types": [
            {
                "type": "pdf",
                "name": "PDF 报告",
                "description": "专业的 PDF 格式报告，适合打印存档",
                "extension": "pdf",
            },
            {
                "type": "word",
                "name": "Word 报告",
                "description": "可编辑的 Word 文档，适合内部流转",
                "extension": "docx",
            },
            {
                "type": "excel",
                "name": "Excel 报告",
                "description": "数据表格格式，适合二次分析",
                "extension": "xlsx",
            },
        ]
    }
