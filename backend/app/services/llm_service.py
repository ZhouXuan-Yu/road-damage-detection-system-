"""
LLM Service — DeepSeek API + Tool Calling for Road Damage Detection System.

This module provides:
- DeepSeek API client with streaming support
- Tool definitions (schema for function calling)
- Tool functions (actual implementations)
- Agent loop: LLM → tool call → result → LLM synthesis → streaming response
"""

from __future__ import annotations

import json
import time
import re
import logging
from pathlib import Path
from typing import Any, Optional

import httpx

from app.config import settings
from app.core.database import AsyncSessionLocal
from app.models.detection import DetectionRecord, DamageOccurrence
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ─── DeepSeek API Client ────────────────────────────────────────────────────────


async def call_deepseek_streaming(
    messages: list[dict],
    tools: list[dict] | None = None,
    model: str = "deepseek-chat",
) -> tuple[str, list[dict], dict]:
    """
    Call DeepSeek API and return (content, tool_calls, raw_data).
    Supports tool calling. Returns when LLM produces a complete response.
    """
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2048,
    }

    logger.info(f"[LLM] calling DeepSeek with {len(messages)} messages, tools={bool(tools)}")
    if tools:
        payload["tools"] = tools
    # Log first message (system prompt truncated) and message count
    for i, m in enumerate(messages):
        role = m.get("role","?")
        content = str(m.get("content",""))[:100]
        tc = m.get("tool_calls")
        logger.info(f"  msg[{i}] role={role} content='{content}' has_tool_calls={bool(tc)}")
        if tc:
            for j, t in enumerate(tc):
                logger.info(f"    tc[{j}]: {t}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"{settings.openai_base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            try:
                err_body = exc.response.json()
                logger.error(f"DeepSeek API error: {exc.response.status_code} — detail: {err_body.get('error', {}).get('message', '')}")
            except Exception:
                logger.error(f"DeepSeek API error: {exc.response.status_code} — {exc.response.text[:500]}")
            raise
        data = resp.json()

    choice = data.get("choices", [{}])[0]
    msg = choice.get("message", {})

    content = msg.get("content", "") or ""

    tool_calls_raw = msg.get("tool_calls", [])
    tool_calls = []
    for tc in tool_calls_raw:
        fn = tc.get("function", {})
        raw_args = fn.get("arguments", "{}")
        if isinstance(raw_args, str):
            try:
                parsed_args = json.loads(raw_args)
            except Exception:
                parsed_args = {}
        else:
            parsed_args = raw_args or {}
        tool_calls.append({
            "id": tc.get("id", ""),
            "name": fn.get("name", ""),
            "arguments": parsed_args,
        })

    return content, tool_calls, data


async def call_deepseek_streaming_chunked(
    messages: list[dict],
    tools: list[dict] | None = None,
    model: str = "deepseek-chat",
):
    """
    Stream DeepSeek API response token by token.
    Yields dicts: {"type": "content", "content": "..."} or {"type": "done"}
    """
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2048,
        "stream": True,
    }

    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{settings.openai_base_url}/chat/completions",
            json=payload,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip() or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    yield {"type": "done"}
                    return
                try:
                    chunk = json.loads(data_str)
                except Exception:
                    continue

                delta = chunk.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    yield {"type": "content", "content": content}

                # Check if tool call in delta
                tc_deltas = delta.get("tool_calls", [])
                for tc_delta in tc_deltas:
                    fn = tc_delta.get("function", {})
                    yield {
                        "type": "tool_call_start",
                        "name": fn.get("name", ""),
                        "id": tc_delta.get("id", ""),
                    }
                    args_str = fn.get("arguments", "")
                    if args_str:
                        yield {"type": "tool_call_delta", "content": args_str}

            yield {"type": "done"}


# ─── Tool Functions (Implementations) ───────────────────────────────────────────


async def _search_detection_history_impl(
    keyword: str = "",
    damage_type: str = "",
    days: int = 30,
    limit: int = 10,
) -> dict:
    """Search detection records from the database."""
    try:
        async with AsyncSessionLocal() as session:
            conditions = []
            if keyword:
                conditions.append(DetectionRecord.filename.contains(keyword))
            if damage_type:
                conditions.append(DetectionRecord.filename.contains(damage_type))

            where_clause = and_(*conditions) if conditions else True

            query = (
                select(DetectionRecord)
                .where(where_clause)
                .order_by(DetectionRecord.created_at.desc())
                .limit(limit)
            )
            result = await session.execute(query)
            records = result.scalars().all()

            items = []
            for r in records:
                items.append({
                    "id": r.id,
                    "filename": r.filename,
                    "file_type": r.file_type,
                    "total_count": r.total_count,
                    "avg_confidence": round(r.avg_confidence, 4),
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                    "detection_data": r.detection_data or "{}",
                })

            return {
                "success": True,
                "count": len(items),
                "records": items,
                "message": f"找到 {len(items)} 条检测记录",
            }
    except Exception as e:
        logger.error(f"search_detection_history failed: {e}")
        return {"success": False, "error": str(e)}


async def _get_detection_statistics_impl() -> dict:
    """Get detection statistics overview."""
    try:
        async with AsyncSessionLocal() as session:
            total_query = select(func.count(DetectionRecord.id))
            total_result = await session.execute(total_query)
            total_records = total_result.scalar() or 0

            count_query = select(func.sum(DetectionRecord.total_count))
            count_result = await session.execute(count_query)
            total_detections = count_result.scalar() or 0

            avg_query = select(func.avg(DetectionRecord.avg_confidence))
            avg_result = await session.execute(avg_query)
            avg_conf = float(avg_result.scalar() or 0)

            # Distribution by damage type
            dist_query = (
                select(
                    DamageOccurrence.class_name,
                    func.count(DamageOccurrence.id).label("count"),
                )
                .group_by(DamageOccurrence.class_name)
                .order_by(func.count(DamageOccurrence.id).desc())
            )
            dist_result = await session.execute(dist_query)
            dist_rows = dist_result.all()

            distribution = {r.class_name: r.count for r in dist_rows}

            return {
                "success": True,
                "total_records": total_records,
                "total_detections": total_detections,
                "avg_confidence": round(avg_conf, 4),
                "distribution": distribution,
                "message": f"系统累计 {total_records} 条检测记录，共 {total_detections} 个病害目标",
            }
    except Exception as e:
        logger.error(f"get_detection_statistics failed: {e}")
        return {"success": False, "error": str(e)}


async def _diagnose_damage_impl(damage_type: str, severity: str = "") -> dict:
    """
    Get damage diagnosis from the knowledge base.
    Maps RDD2022 damage types to causes, repair methods, and severity assessment.
    """
    DAMAGE_KNOWLEDGE = {
        "D00": {
            "name": "纵向裂缝",
            "description": "沿行车方向延伸的裂缝，通常宽度较小，长度不一",
            "causes": ["路面老化", "温度应力", "路基沉降", "超载交通"],
            "severity_levels": {
                "low": "裂缝宽度 < 3mm，建议表面封层处理",
                "medium": "裂缝宽度 3-10mm，建议填封处理",
                "high": "裂缝宽度 > 10mm，建议铣刨重铺",
            },
            "repair_methods": [
                {"method": "表面封层", "cost": "20-50 元/m", "time": "1-2 天", "applicable": "轻度"},
                {"method": "填封处理", "cost": "50-150 元/m", "time": "2-3 天", "applicable": "中度"},
                {"method": "铣刨重铺", "cost": "150-300 元/m", "time": "5-7 天", "applicable": "重度"},
            ],
            "related_types": ["D01", "D10", "D20"],
        },
        "D01": {
            "name": "纵向裂缝(变种)",
            "description": "纵向裂缝的变种形态，特征与D00相似",
            "causes": ["路面老化", "超载交通"],
            "severity_levels": {
                "low": "建议表面封层",
                "medium": "建议填封处理",
                "high": "建议铣刨重铺",
            },
            "repair_methods": [
                {"method": "表面封层", "cost": "20-50 元/m", "time": "1-2 天", "applicable": "轻度"},
                {"method": "填封处理", "cost": "50-150 元/m", "time": "2-3 天", "applicable": "中度"},
            ],
            "related_types": ["D00", "D10"],
        },
        "D10": {
            "name": "横向裂缝",
            "description": "垂直于行车方向的裂缝，通常为温度应力导致",
            "causes": ["温度应力", "半刚性基层收缩", "超载交通"],
            "severity_levels": {
                "low": "裂缝宽度 < 3mm，建议灌缝处理",
                "medium": "裂缝宽度 3-8mm，建议开槽填封",
                "high": "裂缝宽度 > 8mm，建议重铺",
            },
            "repair_methods": [
                {"method": "灌缝处理", "cost": "15-80 元/m", "time": "1-2 天", "applicable": "轻度"},
                {"method": "开槽填封", "cost": "80-180 元/m", "time": "3-5 天", "applicable": "中度"},
                {"method": "铣刨重铺", "cost": "150-300 元/m", "time": "5-7 天", "applicable": "重度"},
            ],
            "related_types": ["D11", "D00", "D20"],
        },
        "D11": {
            "name": "横向裂缝(变种)",
            "description": "横向裂缝的变种形态",
            "causes": ["温度应力", "超载交通"],
            "severity_levels": {
                "low": "建议灌缝处理",
                "medium": "建议开槽填封",
                "high": "建议重铺",
            },
            "repair_methods": [
                {"method": "灌缝处理", "cost": "15-80 元/m", "time": "1-2 天", "applicable": "轻度"},
                {"method": "开槽填封", "cost": "80-180 元/m", "time": "3-5 天", "applicable": "中度"},
            ],
            "related_types": ["D10", "D00"],
        },
        "D20": {
            "name": "龟裂/网裂",
            "description": "相互交错的裂缝形成的网状结构，表明路面结构强度不足",
            "causes": ["荷载疲劳", "基层强度不足", "水分侵蚀", "低温冻融"],
            "severity_levels": {
                "low": "网裂面积 < 1m²，建议微表处",
                "medium": "网裂面积 1-5m²，建议铣刨加铺",
                "high": "网裂面积 > 5m²，建议基层处理后重铺",
            },
            "repair_methods": [
                {"method": "微表处", "cost": "30-60 元/m²", "time": "2-3 天", "applicable": "轻度"},
                {"method": "铣刨加铺", "cost": "80-200 元/m²", "time": "5-10 天", "applicable": "中度"},
                {"method": "基层处理重铺", "cost": "200-500 元/m²", "time": "10-20 天", "applicable": "重度"},
            ],
            "related_types": ["D00", "D10", "D40"],
        },
        "D40": {
            "name": "坑洞/块裂",
            "description": "路面局部破损形成的坑洞或块状破损，影响行车安全",
            "causes": ["水损害", "车辆荷载", "材料老化", "唧浆"],
            "severity_levels": {
                "low": "坑洞直径 < 10cm，建议冷补处理",
                "medium": "坑洞直径 10-30cm，建议热补处理",
                "high": "坑洞直径 > 30cm，建议面积修复",
            },
            "repair_methods": [
                {"method": "冷补处理", "cost": "50-150 元/m²", "time": "1 天", "applicable": "小坑洞"},
                {"method": "热补处理", "cost": "100-300 元/m²", "time": "2-3 天", "applicable": "中等坑洞"},
                {"method": "面积修复", "cost": "300-600 元/m²", "time": "5-10 天", "applicable": "大面积破损"},
            ],
            "related_types": ["D20", "D43", "D44"],
        },
        "D43": {
            "name": "井盖沉降",
            "description": "检查井周围路面沉降或破损，影响行车舒适性",
            "causes": ["压实不足", "井周回填不实", "交通荷载", "井框变形"],
            "severity_levels": {
                "low": "沉降 < 2cm，建议调平处理",
                "high": "沉降 > 2cm，建议注浆加固后重铺",
            },
            "repair_methods": [
                {"method": "调平修复", "cost": "200-500 元/处", "time": "1-2 天", "applicable": "轻度沉降"},
                {"method": "注浆加固", "cost": "500-2000 元/处", "time": "3-5 天", "applicable": "重度沉降"},
            ],
            "related_types": ["D40", "D44"],
        },
        "D44": {
            "name": "车辙",
            "description": "沿轮迹带形成的纵向凹陷，影响行车安全",
            "causes": ["重载交通", "高温软化", "基层塑性变形", "混合料级配不当"],
            "severity_levels": {
                "low": "车辙深度 < 10mm，建议微表处",
                "medium": "车辙深度 10-25mm，建议铣刨重铺",
                "high": "车辙深度 > 25mm，建议深层处理",
            },
            "repair_methods": [
                {"method": "微表处", "cost": "40-80 元/m²", "time": "1-2 天", "applicable": "轻度车辙"},
                {"method": "铣刨重铺", "cost": "100-300 元/m²", "time": "3-7 天", "applicable": "中度车辙"},
                {"method": "深层处理", "cost": "300-600 元/m²", "time": "10-20 天", "applicable": "重度车辙"},
            ],
            "related_types": ["D40", "D20"],
        },
        "D50": {
            "name": "障碍物",
            "description": "路面上的障碍物，如砖石、杂物等",
            "causes": ["人为因素", "交通事故遗留", "道路遗撒"],
            "severity_levels": {
                "low": "小型障碍物，建议清理恢复",
                "high": "大型障碍物，需封闭车道处理",
            },
            "repair_methods": [
                {"method": "清理恢复", "cost": "50-200 元/处", "time": "1 天", "applicable": "所有"},
            ],
            "related_types": [],
        },
    }

    damage_type_upper = damage_type.upper().strip()
    info = DAMAGE_KNOWLEDGE.get(damage_type_upper, {})

    if not info:
        available = ", ".join(DAMAGE_KNOWLEDGE.keys())
        return {
            "success": False,
            "error": f"未知的病害类型 '{damage_type}'，支持的类型：{available}",
        }

    severity_key = severity.lower() if severity else "medium"
    severity_desc = info["severity_levels"].get(severity_key, info["severity_levels"].get("medium", ""))

    return {
        "success": True,
        "damage_type": damage_type_upper,
        "name": info["name"],
        "description": info["description"],
        "causes": info["causes"],
        "severity_assessment": severity_desc,
        "repair_methods": info["repair_methods"],
        "related_types": info["related_types"],
        "message": f"病害类型 {damage_type_upper}（{info['name']}）的诊断信息",
    }


async def _get_repair_suggestion_impl(damage_type: str, severity: str = "") -> dict:
    """Get repair suggestions for a specific damage type and severity."""
    diagnose = await _diagnose_damage_impl(damage_type, severity)
    if not diagnose.get("success"):
        return diagnose

    severity_key = severity.lower() if severity else "medium"
    suggested = []
    for method in diagnose.get("repair_methods", []):
        if not severity or method["applicable"].lower() == severity_key.lower() or severity_key in method["applicable"].lower():
            suggested.append(method)

    if not suggested:
        suggested = diagnose.get("repair_methods", [])

    return {
        "success": True,
        "damage_type": damage_type,
        "name": diagnose["name"],
        "severity": severity_key,
        "suggested_methods": suggested,
        "all_methods": diagnose.get("repair_methods", []),
        "message": f"针对 {diagnose['name']}（{severity_key}）的建议修复方案",
    }


async def _get_knowledge_graph_impl(damage_type: str = "") -> dict:
    """Get knowledge graph data for a specific damage type or all types."""
    if damage_type:
        result = await _diagnose_damage_impl(damage_type)
        if not result.get("success"):
            return result
        return {
            "success": True,
            "node": {
                "id": damage_type.upper(),
                "name": result["name"],
                "type": "Disease",
                "description": result["description"],
                "causes": result["causes"],
                "repair_methods": result.get("repair_methods", []),
            },
            "related": result.get("related_types", []),
            "message": f"病害 {damage_type.upper()} 的图谱数据",
        }

    # Return all nodes
    all_nodes = []
    for dtype, info in {
        "D00": {"name": "纵向裂缝", "description": "沿行车方向延伸的裂缝"},
        "D01": {"name": "纵向裂缝(变种)", "description": "纵向裂缝变种形态"},
        "D10": {"name": "横向裂缝", "description": "垂直于行车方向的裂缝"},
        "D11": {"name": "横向裂缝(变种)", "description": "横向裂缝变种形态"},
        "D20": {"name": "龟裂/网裂", "description": "交错裂缝形成的网状结构"},
        "D40": {"name": "坑洞/块裂", "description": "路面局部破损形成的坑洞"},
        "D43": {"name": "井盖沉降", "description": "检查井周围路面沉降"},
        "D44": {"name": "车辙", "description": "沿轮迹带的纵向凹陷"},
        "D50": {"name": "障碍物", "description": "路面上的障碍物"},
    }.items():
        all_nodes.append({
            "id": dtype,
            "name": info["name"],
            "type": "Disease",
            "description": info["description"],
        })

    return {
        "success": True,
        "nodes": all_nodes,
        "message": f"知识图谱共 {len(all_nodes)} 个病害节点",
    }


# ─── Tool Registry ──────────────────────────────────────────────────────────────

TOOL_FUNCTIONS = {
    "search_detection_history": _search_detection_history_impl,
    "get_detection_statistics": _get_detection_statistics_impl,
    "diagnose_damage": _diagnose_damage_impl,
    "get_repair_suggestion": _get_repair_suggestion_impl,
    "get_knowledge_graph": _get_knowledge_graph_impl,
}

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_detection_history",
            "description": "搜索道路病害检测历史记录。支持按关键词、病害类型搜索最近N天的检测数据。返回文件名、检测数量、置信度等信息。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "搜索关键词，如文件名、病害类型代码（如 D00）",
                    },
                    "damage_type": {
                        "type": "string",
                        "description": "按病害类型筛选，如 D00、D10、D20、D40",
                    },
                    "days": {
                        "type": "integer",
                        "description": "搜索最近多少天的记录，默认30天",
                        "default": 30,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "最多返回多少条记录，默认10条",
                        "default": 10,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_detection_statistics",
            "description": "获取系统的检测统计数据概览，包括总检测次数、各类病害数量分布、平均置信度等。用于回答关于系统整体检测情况的询问。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "diagnose_damage",
            "description": "根据病害类型代码进行病害诊断分析。返回病害名称、描述、成因分析、严重程度评估和修复建议。是病害分析的核心工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "damage_type": {
                        "type": "string",
                        "description": "病害类型代码，如 D00（纵向裂缝）、D10（横向裂缝）、D20（龟裂）、D40（坑洞）、D43（井盖沉降）、D44（车辙）、D50（障碍物）",
                    },
                    "severity": {
                        "type": "string",
                        "description": "病害严重程度，可选 low（轻度）、medium（中度）、high（重度）",
                        "default": "medium",
                    },
                },
                "required": ["damage_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_repair_suggestion",
            "description": "获取针对特定病害类型和严重程度的修复建议。包括修复方法、预估费用、施工周期等信息。用于回答关于如何修复病害的问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "damage_type": {
                        "type": "string",
                        "description": "病害类型代码，如 D00、D10、D20、D40、D43、D44、D50",
                    },
                    "severity": {
                        "type": "string",
                        "description": "病害严重程度，可选 low（轻度）、medium（中度）、high（重度）",
                        "default": "medium",
                    },
                },
                "required": ["damage_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_knowledge_graph",
            "description": "获取知识图谱数据。可以查询特定病害类型的节点信息（包含关联病害），也可以获取全部病害节点列表。用于回答关于病害关系网络的问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "damage_type": {
                        "type": "string",
                        "description": "病害类型代码，如留空则返回所有病害节点",
                    },
                },
                "required": [],
            },
        },
    },
]


# ─── System Prompt ───────────────────────────────────────────────────────────────


SYSTEM_PROMPT = """你是一个专业的**道路病害智能分析助手**，服务于道路病害智能检测系统。

你的核心职责：
1. 分析检测数据，回答关于病害类型、数量、分布的问题
2. 提供病害诊断和成因分析
3. 给出养护修复建议和预估费用
4. 解答关于道路养护知识的问题

**关键规则 — 你必须严格遵守：**
1. **必须调用工具获取真实数据**：当用户询问检测记录、统计数据、病害诊断时，必须调用相应工具，不能凭空编造数据
2. **先搜索后回答**：涉及具体数据的问题，先调用工具获取数据，再基于数据回答
3. **数据驱动的回答**：引用具体的数值（检测数量、置信度、费用等），不要模糊表述
4. **中文回答**：始终使用中文，用简洁专业的语言
5. **结构化输出**：复杂问题分点回答，使用列表和表格格式

**病害类型编码（RDD2022标准）：**
- D00/D01：纵向裂缝
- D10/D11：横向裂缝
- D20：龟裂/网裂
- D40：坑洞/块裂
- D43：井盖沉降
- D44：车辙
- D50：障碍物

**工作流程：**
- 用户询问检测记录 → 调用 search_detection_history
- 用户询问统计概览 → 调用 get_detection_statistics
- 用户询问病害详情/成因/修复 → 调用 diagnose_damage
- 用户询问修复方案/费用 → 调用 get_repair_suggestion
- 用户询问病害关系网络 → 调用 get_knowledge_graph

请始终基于工具返回的真实数据来回答用户问题。"""
