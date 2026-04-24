"""
报告服务 - 总调度模块
提供报告创建的统一入口，协调各格式报告生成器
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional
from statistics import mean

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.detection import DetectionRecord, DamageOccurrence
from app.models.report import Report
from app.services.pdf_report import generate_pdf_report
from app.services.word_report import generate_word_report
from app.services.excel_report import generate_excel_report
from app.services.ai_analysis import generate_ai_analysis_content


from app.core.constants import DAMAGE_NAME_CN


async def load_detection_records(
    db: AsyncSession,
    record_ids: list[int]
) -> list[DetectionRecord]:
    """加载检测记录及其关联的病害事件"""
    if not record_ids:
        return []

    query = select(DetectionRecord).options(
        selectinload(DetectionRecord.occurrences)
    ).where(DetectionRecord.id.in_(record_ids))
    result = await db.execute(query)
    records = result.scalars().all()

    return list(records)


def summarize_detections(records: list[DetectionRecord]) -> dict:
    """汇总检测数据用于报告生成"""
    if not records:
        return {
            "total_records": 0,
            "total_objects": 0,
            "avg_confidence": 0.0,
            "damage_distribution": {},
            "severity_distribution": {"low": 0, "medium": 0, "high": 0},
            "records": [],
        }
    
    total_objects = sum(r.total_count for r in records)
    weighted_conf_sum = sum(r.avg_confidence * r.total_count for r in records)
    avg_confidence = weighted_conf_sum / total_objects if total_objects > 0 else 0.0
    
    # 按类型聚合病害
    damage_distribution: dict[str, int] = {}
    severity_distribution: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
    
    for record in records:
        # 解析 detection_data JSON
        if record.detection_data:
            try:
                data = json.loads(record.detection_data) if isinstance(record.detection_data, str) else record.detection_data
                if isinstance(data, dict):
                    for cls, count in data.items():
                        damage_distribution[cls] = damage_distribution.get(cls, 0) + count
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and "class_name" in item:
                            cls = item["class_name"]
                            damage_distribution[cls] = damage_distribution.get(cls, 0) + 1
                        elif isinstance(item, dict) and "class" in item:
                            cls = item["class"]
                            damage_distribution[cls] = damage_distribution.get(cls, 0) + 1
            except (json.JSONDecodeError, TypeError):
                pass
        
        # 从 occurrences 聚合严重程度
        if record.occurrences:
            for occ in record.occurrences:
                if occ.severity:
                    sev = occ.severity.lower()
                    if sev in severity_distribution:
                        severity_distribution[sev] += 1
    
    return {
        "total_records": len(records),
        "total_objects": total_objects,
        "avg_confidence": avg_confidence,
        "damage_distribution": damage_distribution,
        "severity_distribution": severity_distribution,
        "records": records,
    }


async def create_report(
    db: AsyncSession,
    title: str,
    report_type: str,
    record_ids: Optional[list[int]] = None,
    include_ai: bool = False,
) -> Report:
    """
    创建报告的总入口函数
    
    Args:
        db: 数据库会话
        title: 报告标题
        report_type: 报告类型 ("pdf", "word", "excel")
        record_ids: 关联的检测记录ID列表
        include_ai: 是否包含AI分析
    
    Returns:
        Report: 创建的报告记录
    """
    # 1. 加载关联的检测记录
    records = await load_detection_records(db, record_ids or [])
    
    # 2. 汇总检测数据
    summary = summarize_detections(records)
    
    # 3. AI 分析内容（可选）
    ai_analysis = ""
    if include_ai and settings.llm_api_key:
        try:
            ai_analysis = await generate_ai_analysis_content(summary)
        except Exception as e:
            print(f"AI analysis generation failed: {e}")
            ai_analysis = ""
    
    # 4. 生成报告文件
    file_ext_map = {"pdf": "pdf", "word": "docx", "excel": "xlsx"}
    file_ext = file_ext_map.get(report_type, "pdf")
    filename = f"report_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
    output_path = settings.reports_dir / filename
    
    # 生成报告内容摘要
    content_summary = _generate_content_summary(summary)
    
    # 根据类型调用对应生成器
    if report_type == "pdf":
        generate_pdf_report(records, summary, ai_analysis, output_path)
    elif report_type == "word":
        generate_word_report(records, summary, ai_analysis, output_path)
    else:  # excel
        generate_excel_report(records, summary, output_path)
    
    # 5. 保存报告记录到数据库
    report = Report(
        title=title,
        report_type=report_type,
        file_path=str(output_path),
        content_summary=content_summary,
        ai_analysis=ai_analysis if ai_analysis else None,
        is_generated=True,
        record_ids=json.dumps(record_ids) if record_ids else None,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    return report


def _generate_content_summary(summary: dict) -> str:
    """生成报告内容摘要"""
    parts = []
    
    parts.append(f"共 {summary['total_records']} 条检测记录")
    parts.append(f"检测到 {summary['total_objects']} 个病害目标")
    parts.append(f"平均置信度 {summary['avg_confidence']:.1%}")
    
    # 病害类型分布
    if summary['damage_distribution']:
        dist_items = sorted(
            summary['damage_distribution'].items(),
            key=lambda x: -x[1]
        )
        dist_str = ", ".join([
            f"{DAMAGE_NAME_CN.get(k, k)}: {v}"
            for k, v in dist_items[:5]
        ])
        parts.append(f"病害分布: {dist_str}")
    
    return "; ".join(parts)


async def get_report_with_records(
    db: AsyncSession,
    report_id: int
) -> tuple[Report, list[DetectionRecord]]:
    """获取报告及其关联的检测记录"""
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    
    if not report:
        return None, []
    
    # 解析关联的记录ID
    record_ids = []
    if report.record_ids:
        try:
            record_ids = json.loads(report.record_ids)
        except json.JSONDecodeError:
            record_ids = []
    
    records = await load_detection_records(db, record_ids)
    
    return report, records
