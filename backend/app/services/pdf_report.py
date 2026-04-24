"""
PDF 报告生成模块
使用 ReportLab 生成专业的道路病害检测分析报告
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether
)

from app.models.detection import DetectionRecord

# 病害类型中文名称映射
DAMAGE_NAME_CN = {
    "D00": "纵向裂缝",
    "D01": "纵向裂缝",
    "D10": "横向裂缝",
    "D11": "横向裂缝",
    "D20": "龟裂/网裂",
    "D40": "坑洞/块裂",
    "D43": "井盖沉降",
    "D44": "车辙",
    "D50": "障碍物",
}


# 中文字体配置 - 尝试多个字体路径以兼容不同环境
def get_font_paths():
    """获取可用的中文字体路径"""
    fonts = []
    
    # Windows 系统字体路径
    windows_fonts = [
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/msyh.ttc",  # 微软雅黑
        "C:/Windows/Fonts/simsun.ttc",  # 宋体
    ]
    
    # Linux 系统字体路径
    linux_fonts = [
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    ]
    
    # macOS 系统字体路径
    mac_fonts = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
    ]
    
    if os.name == 'nt':  # Windows
        fonts = windows_fonts
    elif os.uname().sysname == 'Darwin':  # macOS
        fonts = mac_fonts + windows_fonts
    else:  # Linux
        fonts = linux_fonts + windows_fonts
    
    # 返回存在的字体
    for font in fonts:
        if os.path.exists(font):
            return font
    
    return None  # 未找到字体


FONT_PATH = get_font_paths()


def register_chinese_fonts():
    """注册中文字体"""
    if FONT_PATH and FONT_PATH.endswith('.ttf'):
        try:
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            pdfmetrics.registerFont(TTFont("ChineseFont", FONT_PATH))
            return True
        except Exception as e:
            print(f"Failed to register font: {e}")
    return False


def create_styles():
    """创建自定义样式"""
    styles = getSampleStyleSheet()
    
    # 尝试注册中文字体
    has_chinese_font = register_chinese_fonts()
    font_name = "ChineseFont" if has_chinese_font else "Helvetica"
    
    # 标题样式
    styles.add(ParagraphStyle(
        name="CustomTitle",
        fontName=font_name,
        fontSize=22,
        leading=30,
        alignment=TA_CENTER,
        spaceAfter=15,
        textColor=colors.HexColor("#1e40af"),
    ))
    
    # 一级标题
    styles.add(ParagraphStyle(
        name="CustomHeading1",
        fontName=font_name,
        fontSize=16,
        leading=22,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor("#1e3a5f"),
    ))
    
    # 二级标题
    styles.add(ParagraphStyle(
        name="CustomHeading2",
        fontName=font_name,
        fontSize=13,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
        textColor=colors.HexColor("#374151"),
    ))
    
    # 正文
    styles.add(ParagraphStyle(
        name="CustomNormal",
        fontName=font_name,
        fontSize=10,
        leading=16,
        spaceBefore=3,
        spaceAfter=3,
    ))
    
    # 表格标题
    styles.add(ParagraphStyle(
        name="TableHeader",
        fontName=font_name,
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
    ))
    
    # 页脚
    styles.add(ParagraphStyle(
        name="Footer",
        fontName=font_name,
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.grey,
    ))
    
    return styles


def create_table_style():
    """创建表格样式"""
    return [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica" if not FONT_PATH else "ChineseFont"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOLD", (0, 0), (-1, 0), True),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]


def generate_pdf_report(
    records: list[DetectionRecord],
    summary: dict,
    ai_analysis: str,
    output_path: Path,
) -> str:
    """
    生成完整的 PDF 报告
    
    Args:
        records: 检测记录列表
        summary: 汇总数据
        ai_analysis: AI 分析内容
        output_path: 输出文件路径
    
    Returns:
        str: 报告摘要
    """
    styles = create_styles()
    table_style = create_table_style()
    
    # 创建文档
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )
    
    elements = []
    report_id = f"REP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # ==================== 封面 ====================
    elements.append(Spacer(1, 30*mm))
    elements.append(Paragraph("道路病害检测分析报告", styles["CustomTitle"]))
    elements.append(Spacer(1, 10*mm))
    
    # 报告基本信息表格
    cover_data = [
        ["报告编号", report_id],
        ["生成时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ["报告类型", "PDF 格式"],
        ["包含检测记录", f"{len(records)} 条"],
    ]
    
    cover_table = Table(cover_data, colWidths=[80, 250])
    cover_style = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica" if not FONT_PATH else "ChineseFont"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica" if not FONT_PATH else "ChineseFont"),
        ("BOLD", (0, 0), (0, -1), True),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
    ]
    cover_table.setStyle(TableStyle(cover_style))
    elements.append(cover_table)
    
    elements.append(Spacer(1, 15*mm))
    
    # ==================== 一、检测概况 ====================
    elements.append(Paragraph("一、检测概况摘要", styles["CustomHeading1"]))
    
    overview_data = [
        ["总检测记录", f"{summary['total_records']} 条"],
        ["病害目标总数", f"{summary['total_objects']} 个"],
        ["平均置信度", f"{summary['avg_confidence']:.2%}"],
    ]
    
    overview_table = Table(overview_data, colWidths=[80, 250])
    overview_table.setStyle(TableStyle(table_style + [
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eff6ff")),
    ]))
    elements.append(overview_table)
    
    elements.append(Spacer(1, 8*mm))
    
    # ==================== 二、病害类型分布 ====================
    elements.append(Paragraph("二、病害类型分布", styles["CustomHeading1"]))
    
    dist_data = [["序号", "病害类型", "代码", "数量", "占比"]]
    total = summary["total_objects"]
    
    sorted_dist = sorted(
        summary["damage_distribution"].items(),
        key=lambda x: -x[1]
    )
    
    for i, (cls, count) in enumerate(sorted_dist):
        pct = count / total * 100 if total > 0 else 0
        dist_data.append([
            str(i + 1),
            DAMAGE_NAME_CN.get(cls, cls),
            cls,
            str(count),
            f"{pct:.1f}%",
        ])
    
    dist_table = Table(dist_data, colWidths=[30, 70, 50, 50, 50])
    dist_style = table_style + [
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
    ]
    dist_table.setStyle(TableStyle(dist_style))
    elements.append(dist_table)
    
    # ==================== 三、严重程度分布 ====================
    if summary.get("severity_distribution"):
        elements.append(Spacer(1, 8*mm))
        elements.append(Paragraph("三、严重程度分布", styles["CustomHeading1"]))
        
        sev_data = [["严重程度", "数量", "说明"]]
        sev_map = {
            "low": "轻度",
            "medium": "中度",
            "high": "高"
        }
        sev_desc = {
            "low": "面积占比 < 1%",
            "medium": "面积占比 1-5%",
            "high": "面积占比 > 5%"
        }
        
        for sev, count in summary["severity_distribution"].items():
            sev_data.append([
                sev_map.get(sev, sev),
                str(count),
                sev_desc.get(sev, ""),
            ])
        
        sev_table = Table(sev_data, colWidths=[60, 50, 200])
        sev_table.setStyle(TableStyle(table_style + [
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef3c7")]),
        ]))
        elements.append(sev_table)
    
    # ==================== 第二页：检测记录详情 ====================
    elements.append(PageBreak())
    elements.append(Paragraph("四、检测记录详情", styles["CustomHeading1"]))
    
    detail_data = [["序号", "文件名", "类型", "病害数", "置信度", "时间"]]
    
    for i, r in enumerate(records):
        detail_data.append([
            str(i + 1),
            r.filename[:25] + "..." if len(r.filename) > 25 else r.filename,
            "图片" if r.file_type == "image" else "视频",
            str(r.total_count),
            f"{r.avg_confidence:.2%}",
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-",
        ])
    
    detail_table = Table(detail_data, colWidths=[25, 100, 40, 40, 50, 75])
    detail_table.setStyle(TableStyle(table_style + [
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
    ]))
    elements.append(detail_table)
    
    # ==================== 标注图片 ====================
    image_records = [r for r in records if r.thumbnail_path or r.result_path]
    if image_records:
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph("五、标注结果图片", styles["CustomHeading1"]))

        for i, r in enumerate(image_records[:4]):  # 最多4张
            img_path = r.thumbnail_path or r.result_path
            if img_path:
                path_obj = Path(img_path)
                # 跳过视频文件和不存在/不可读的图片
                if path_obj.suffix.lower() in [".mp4", ".avi", ".mov", ".mkv"]:
                    continue
                if not path_obj.exists():
                    continue
                try:
                    elements.append(Spacer(1, 3*mm))
                    img = Image(str(path_obj), width=160*mm, height=120*mm)
                    elements.append(img)
                    elements.append(Paragraph(
                        f"图 {i+1}: {r.filename}",
                        styles["CustomNormal"]
                    ))
                except Exception:
                    # 忽略无法加载的图片（HEIC 等格式）
                    pass
    
    # ==================== AI 分析建议 ====================
    if ai_analysis:
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph("六、AI 智能分析建议", styles["CustomHeading1"]))
        
        ai_paragraphs = ai_analysis.split("\n")
        for para in ai_paragraphs:
            if para.strip():
                elements.append(Paragraph(para.strip(), styles["CustomNormal"]))
                elements.append(Spacer(1, 3*mm))
    
    # ==================== 页脚 ====================
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(20*mm, 10*mm, f"道路病害智能检测系统 | {report_id}")
        canvas.drawRightString(200*mm, 10*mm, f"第 {doc.page} 页")
        canvas.restoreState()
    
    # 生成 PDF
    doc.build(elements, onFirstPage=footer, onLaterPages=footer)
    
    return f"报告生成成功，共 {len(records)} 条检测记录，{total} 个病害目标"
