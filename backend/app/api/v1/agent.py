"""
Agent API — Pre-execution mode (no tool calling, compatible with all DeepSeek API keys).
Routes user messages to appropriate tools, executes them first, then synthesizes with LLM.
"""
import json
import re
import time
import logging
import uuid
from typing import Literal

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas.agent import ChatRequest, ChatResponse
from app.services.llm_service import (
    TOOL_FUNCTIONS,
    SYSTEM_PROMPT,
    call_deepseek_streaming,
)

router = APIRouter(prefix="/agent", tags=["AI Agent"])

logger = logging.getLogger(__name__)

# In-memory session store
chat_sessions: dict[str, list[dict]] = {}


# ─── Helpers ────────────────────────────────────────────────────────────────────


def _make_sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _emit_step(
    emitter: list[str],
    icon: str,
    title: str,
    subtitle: str,
    detail: str,
    status: str = "done",
    extra: dict | None = None,
) -> str:
    """Emit one SSE step record and also return it for direct yielding."""
    data = {
        "type": "step",
        "icon": icon,
        "title": title,
        "subtitle": subtitle,
        "detail": detail,
        "status": status,
    }
    if extra:
        data["extra"] = extra
    return _make_sse(data)


# ─── Tool pre-execution ───────────────────────────────────────────────────────


def _identify_tools(user_msg: str) -> list[tuple[str, dict]]:
    """
    Based on user message keywords, determine which tools to call and with what args.
    Returns list of (tool_name, arguments).
    """
    msg_lower = user_msg.lower()
    tools_to_call = []

    # Detection records + statistics
    detection_keywords = [
        "检测", "病害", "记录", "发现了", "最近", "历史",
        "查询", "搜索", "多少", "统计", "多少条", "几次",
    ]
    if any(kw in msg_lower for kw in detection_keywords):
        days = 30 if any(kw in msg_lower for kw in ["最近", "最新", "近期"]) else 90
        tools_to_call.append(("search_detection_history", {"days": days, "limit": 20}))
        tools_to_call.append(("get_detection_statistics", {}))

    # Statistics only
    elif any(kw in msg_lower for kw in ["统计", "概览", "整体", "概况", "总体", "累计", "总数", "总量"]):
        tools_to_call.append(("get_detection_statistics", {}))

    # Damage diagnosis
    elif any(kw in msg_lower for kw in ["诊断", "成因", "原因", "怎么形成", "病害类型", "什么病害"]):
        m = re.search(r"D\d+", user_msg.upper())
        damage_type = m.group() if m else "D00"
        tools_to_call.append(("diagnose_damage", {"damage_type": damage_type, "severity": "medium"}))

    # Repair suggestions
    elif any(kw in msg_lower for kw in ["修复", "养护", "怎么处理", "如何修复", "费用", "价格", "多少钱", "预算", "方案"]):
        m = re.search(r"D\d+", user_msg.upper())
        damage_type = m.group() if m else "D00"
        tools_to_call.append(("get_repair_suggestion", {"damage_type": damage_type}))

    # Knowledge graph
    elif any(kw in msg_lower for kw in ["知识图谱", "关系", "关联", "知识图"]):
        tools_to_call.append(("get_knowledge_graph", {}))

    return tools_to_call


async def _pre_execute_tools(user_msg: str) -> list[dict]:
    """Execute tools identified from user message. Returns list of {tool, args, result}."""
    tools_to_call = _identify_tools(user_msg)
    results = []

    for tool_name, args in tools_to_call:
        func = TOOL_FUNCTIONS.get(tool_name)
        if func:
            try:
                result = await func(**args)
                results.append({"tool": tool_name, "args": args, "result": result})
            except Exception as e:
                logger.error(f"Pre-execute tool {tool_name} error: {e}")
                results.append({"tool": tool_name, "args": args, "result": {"success": False, "error": str(e)}})
        else:
            logger.warning(f"Unknown tool: {tool_name}")

    return results


def _build_messages_with_tools(
    session_id: str,
    user_msg: str,
    tool_results: list[dict],
) -> list[dict]:
    """Build messages list with pre-executed tool results embedded."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include conversation history
    history = chat_sessions.get(session_id, [])
    for h in history[-20:]:
        content = h.get("content")
        messages.append({
            "role": h["role"],
            "content": str(content) if content is not None else "",
        })

    messages.append({"role": "user", "content": user_msg})

    # Embed tool results as a system-level context
    if tool_results:
        lines = ["根据您的问题，我已查询了以下数据："]
        for tr in tool_results:
            tool_name = tr["tool"]
            args = tr["args"]
            result = tr["result"]
            lines.append(f"\n【{tool_name}】参数：{json.dumps(args, ensure_ascii=False)}")
            if isinstance(result, dict):
                for k, v in result.items():
                    if k not in ("visualization_base64",):
                        lines.append(f"  {k}: {v}")
            else:
                lines.append(f"  {str(result)}")

        tool_context = "\n".join(lines)
        messages.append({
            "role": "system",
            "content": f"【工具执行结果】\n{tool_context}\n\n请基于以上真实数据，用中文回答用户问题。如果数据为空或查询失败，请如实说明。",
        })

    return messages


# ─── SSE Streaming endpoint ───────────────────────────────────────────────────


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming agent endpoint with pre-execution mode.
    Streams SSE events: step updates + token chunks + final answer + done signal.
    """
    session_id = request.session_id or "default"
    chat_sessions.setdefault(session_id, [])

    user_msg = request.message.strip()
    if not user_msg:
        yield _make_sse({"type": "error", "message": "消息不能为空"})
        yield _make_sse({"type": "done"})
        return

    # Append user message to session history
    chat_sessions[session_id].append({"role": "user", "content": user_msg})

    emitter: list[str] = []
    t_start = time.time()

    def _y(em: str):
        """Yield a single SSE record."""
        return em

    try:
        # ── Step 1: Identify and pre-execute tools ───────────────────────
        yield await _emit_step(
            emitter, "🔍", "分析问题", "关键词识别",
            f"正在分析您的问题: {user_msg[:50]}...",
        )

        tool_results = await _pre_execute_tools(user_msg)

        if tool_results:
            tool_names = [tr["tool"] for tr in tool_results]
            yield await _emit_step(
                emitter, "📊", "工具执行完成",
                f"执行了 {len(tool_results)} 个工具",
                f"已执行的工具：{', '.join(tool_names)}",
                status="done",
            )
        else:
            yield await _emit_step(
                emitter, "💡", "直接回答", "无需数据库查询",
                "正在生成回答...", status="done",
            )

        # ── Step 2: Build messages and call LLM ──────────────────────────
        yield await _emit_step(
            emitter, "🤖", "LLM 推理中", "DeepSeek API",
            "正在综合数据生成回答...", status="running",
        )

        messages = _build_messages_with_tools(session_id, user_msg, tool_results)

        content, _, _ = await call_deepseek_streaming(messages)

        # ── Step 3: Save history and stream response ─────────────────────
        chat_sessions[session_id].append({"role": "assistant", "content": content})

        llm_ms = round((time.time() - t_start) * 1000)
        yield await _emit_step(
            emitter, "✅", "回答完成",
            f"回答完成 — {llm_ms}ms",
            "已生成完整回答",
            status="done",
        )

        # Yield content characters one by one
        for char in content:
            yield _make_sse({"type": "content", "content": char})

        yield _make_sse({"type": "done"})

    except httpx.HTTPStatusError as exc:
        logger.error(f"DeepSeek API error: {exc.response.status_code} — {exc.response.text[:200]}")
        yield _make_sse({"type": "error", "message": "LLM 服务暂时不可用，请稍后再试。"})
        yield _make_sse({"type": "done"})

    except Exception as e:
        logger.exception(f"Agent error for session {session_id}: {e}")
        yield _make_sse({"type": "error", "message": f"Agent 服务异常: {str(e)}"})
        yield _make_sse({"type": "done"})


# ─── Non-streaming fallback ────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Non-streaming chat endpoint."""
    session_id = request.session_id or "default"
    chat_sessions.setdefault(session_id, [])

    user_msg = request.message.strip()
    if not user_msg:
        return ChatResponse(session_id=session_id, message="消息不能为空", sources=None)

    chat_sessions[session_id].append({"role": "user", "content": user_msg})

    try:
        tool_results = await _pre_execute_tools(user_msg)
        messages = _build_messages_with_tools(session_id, user_msg, tool_results)
        content, _, _ = await call_deepseek_streaming(messages)

        chat_sessions[session_id].append({"role": "assistant", "content": content})
        return ChatResponse(session_id=session_id, message=content, sources=None)

    except httpx.HTTPStatusError:
        return ChatResponse(session_id=session_id, message="LLM 服务暂时不可用，请稍后再试。", sources=None)
    except Exception as e:
        logger.exception(f"Agent error: {e}")
        return ChatResponse(session_id=session_id, message=f"服务异常: {str(e)}", sources=None)
