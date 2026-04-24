"""
AI 分析内容生成模块
使用 DeepSeek API 生成专业的病害分析和建议
"""

from app.config import settings
from app.core.constants import DAMAGE_NAME_CN


async def generate_ai_analysis_content(summary: dict) -> str:
    """
    调用 DeepSeek 生成 AI 分析建议
    
    Args:
        summary: 汇总数据字典，包含:
            - total_records: 检测记录数
            - total_objects: 病害目标总数
            - avg_confidence: 平均置信度
            - damage_distribution: 病害类型分布
            - severity_distribution: 严重程度分布
    
    Returns:
        str: AI 生成的分析建议文本
    """
    if not settings.llm_api_key:
        return _generate_fallback_analysis(summary)
    
    try:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.openai_base_url,
        )
        
        # 构建病害分布描述
        damage_lines = []
        sorted_dist = sorted(
            summary.get("damage_distribution", {}).items(),
            key=lambda x: -x[1]
        )
        
        total = summary.get("total_objects", 0)
        for cls, count in sorted_dist[:8]:  # 最多8种
            pct = count / total * 100 if total > 0 else 0
            name = DAMAGE_NAME_CN.get(cls, cls)
            damage_lines.append(f"- {cls} {name}: {count} 个 ({pct:.1f}%)")
        
        damage_text = "\n".join(damage_lines) if damage_lines else "无"
        
        # 严重程度分布
        sev_lines = []
        sev_map = {"low": "轻度", "medium": "中度", "high": "高"}
        for sev, count in summary.get("severity_distribution", {}).items():
            sev_lines.append(f"- {sev_map.get(sev, sev)}: {count} 个")
        sev_text = "\n".join(sev_lines) if sev_lines else "无"
        
        prompt = f"""你是一个专业的道路养护工程师。基于以下道路病害检测数据，
请用中文生成一段专业的病害分析和建议（200-300字）：

检测概况：
- 检测记录数: {summary.get('total_records', 0)} 条
- 病害目标总数: {summary.get('total_objects', 0)} 个
- 平均置信度: {summary.get('avg_confidence', 0):.2%}

病害分布：
{damage_text}

严重程度分布：
{sev_text}

请从以下角度进行分析：
1. 整体路况评价（根据病害数量、类型和严重程度）
2. 主要病害及成因分析
3. 养护优先级建议（按严重程度排序）
4. 推荐修复方案及预估处理时限

要求：语言专业、简洁、有实际指导意义。直接输出分析内容，不要有其他前缀。"""
        
        response = await client.chat.completions.create(
            model=settings.llm_model or "deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个专业的道路养护工程师，擅长道路病害诊断和养护规划。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.7,
        )
        
        content = response.choices[0].message.content
        return content.strip() if content else ""
        
    except Exception as e:
        print(f"AI analysis error: {e}")
        return _generate_fallback_analysis(summary)


def _generate_fallback_analysis(summary: dict) -> str:
    """
    当 AI 不可用时，生成基础分析文本
    
    Args:
        summary: 汇总数据
    
    Returns:
        str: 基础分析文本
    """
    lines = []
    
    # 整体评价
    total = summary.get("total_objects", 0)
    total_records = summary.get("total_records", 0)
    
    if total == 0:
        lines.append("本次检测未发现明显病害，道路状况良好。")
    elif total <= 5:
        lines.append(f"本次检测共发现 {total} 处病害，整体路况良好，建议进行日常巡检关注。")
    elif total <= 15:
        lines.append(f"本次检测共发现 {total} 处病害，存在一定程度的路面损坏，建议近期安排预防性养护。")
    else:
        lines.append(f"本次检测共发现 {total} 处病害，路面损坏较为严重，建议尽快安排专项养护处理。")
    
    # 病害类型分析
    sorted_dist = sorted(
        summary.get("damage_distribution", {}).items(),
        key=lambda x: -x[1]
    )
    
    if sorted_dist:
        top_damage = sorted_dist[0]
        cls, count = top_damage
        name = DAMAGE_NAME_CN.get(cls, cls)
        lines.append(f"主要病害类型为 {cls} {name}，共 {count} 处，占比 {count/total*100:.1f}%")
    
    # 严重程度分析
    severity = summary.get("severity_distribution", {})
    high_count = severity.get("high", 0)
    
    if high_count > 0:
        lines.append(f"其中 {high_count} 处为高严重程度病害，建议优先处理。")
    else:
        lines.append("病害严重程度整体为轻中度，建议按计划进行养护处理。")
    
    # 建议
    lines.append("建议对检测发现的病害及时进行修复处理，避免进一步恶化。")
    
    return "\n".join(lines)
