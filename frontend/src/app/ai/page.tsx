"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { AgentStepEvent } from "@/lib/api";
import { useChatStore } from "@/stores/use-chat-store";
import { Bot, User, Loader2, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, XCircle, Terminal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface PipelineStep {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  detail: string;
  status: "running" | "done" | "error";
  /** Extra payload for JSON detail panels */
  extra?: {
    tool_name?: string;
    tool_args?: Record<string, unknown>;
    tool_result?: Record<string, unknown>;
    tool_ms?: number;
    [key: string]: unknown;
  };
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  return <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />;
}

function renderDetail(detail: string) {
  return detail
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("  ") || line.match(/^\s+\S/)) {
        return (
          <span key={i} className="text-orange-400 ml-4">
            {line}
            {"\n"}
          </span>
        );
      }
      return (
        <span key={i}>
          {line}
          {"\n"}
        </span>
      );
    });
}

/* ─── Tool Arg/Result JSON Panel ─────────────────────────────────────── */

function JsonPanel({
  label,
  labelClass,
  data,
}: {
  label: string;
  labelClass: string;
  data: unknown;
}) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const sizeKb = (new Blob([json]).size / 1024).toFixed(1);

  return (
    <div className="mt-1.5 border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] hover:bg-white/5 transition-colors"
      >
        <span className={cn("font-medium px-1.5 py-0.5 rounded text-white", labelClass)}>
          {label}
        </span>
        <span className="text-gray-500 font-mono ml-auto">{sizeKb} KB</span>
        {open ? (
          <ChevronUp className="h-3 w-3 text-gray-400" />
        ) : (
          <ChevronDown className="h-3 w-3 text-gray-400" />
        )}
      </button>
      {open && (
        <pre className="px-3 py-2 text-[10px] text-green-300 font-mono whitespace-pre-wrap break-all bg-black/20 max-h-48 overflow-y-auto">
          {json}
        </pre>
      )}
    </div>
  );
}

/* ─── Trace / Waterfall Block ────────────────────────────────────────── */

function TraceBlock({ steps }: { steps: PipelineStep[] }) {
  const [open, setOpen] = useState(true);
  const totalMs = steps.reduce((sum, s) => {
    const m = s.subtitle?.match(/(\d+)ms/);
    return sum + (m ? parseInt(m[1]) : 0);
  }, 0);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
      >
        <span
          className={cn(
            "text-xs transition-transform duration-200",
            open ? "rotate-90" : ""
          )}
        >
          ▶
        </span>
        <Terminal className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-blue-700">Agent 执行流程</span>
        <span className="text-[10px] text-gray-400 ml-1">{steps.length} 步骤</span>
        <span className="ml-auto text-[10px] text-gray-400">{totalMs}ms</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Steps waterfall */}
      {open && (
        <div className="divide-y divide-blue-100">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "px-4 py-2.5 transition-colors",
                step.status === "running" && "bg-blue-50",
                step.status === "done" && "bg-white",
                step.status === "error" && "bg-red-50"
              )}
            >
              {/* Step header */}
              <div className="flex items-start gap-2.5">
                <StatusIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">
                      {step.icon} {step.title}
                    </span>
                    {step.subtitle && (
                      <span className="text-[10px] text-gray-400 truncate">{step.subtitle}</span>
                    )}
                  </div>

                  {/* Detail text */}
                  {step.detail && (
                    <pre
                      className={cn(
                        "mt-1 text-[10px] font-mono whitespace-pre-wrap break-all leading-relaxed",
                        step.status === "error" ? "text-red-500" : "text-gray-500"
                      )}
                    >
                      {renderDetail(step.detail)}
                    </pre>
                  )}

                  {/* Tool JSON panels */}
                  {step.extra?.tool_args !== undefined && (
                    <JsonPanel
                      label="📤 工具参数"
                      labelClass="bg-orange-500/80"
                      data={{ function: step.extra.tool_name, arguments: step.extra.tool_args }}
                    />
                  )}
                  {step.extra?.tool_result !== undefined && (
                    <JsonPanel
                      label="📥 工具返回"
                      labelClass="bg-blue-500/80"
                      data={step.extra.tool_result}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */

export default function AIPage() {
  const { messages, isLoading, addMessage, setLoading, reset } = useChatStore();
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [showTrace, setShowTrace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stepIdRef = useRef(0);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, pipelineSteps]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setError(null);
    setStreamingContent("");
    setPipelineSteps([]);
    setShowTrace(true);
    setLoading(true);

    addMessage({ id: Date.now().toString(), role: "user", content: trimmed });

    abortRef.current = api.agent.chatStream(
      trimmed,
      undefined,
      {
        onContent: (char) => {
          setStreamingContent((prev) => prev + char);
        },
        onStep: (step: AgentStepEvent) => {
          if (step.type === "step" || step.type === "step_update") {
            setPipelineSteps((prev) => {
              const existingIdx = prev.findIndex((s) => s.title === step.title);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  subtitle: step.subtitle ?? updated[existingIdx].subtitle,
                  detail: step.detail ?? updated[existingIdx].detail,
                  status: (step.status as PipelineStep["status"]) ?? updated[existingIdx].status,
                  extra: (step as AgentStepEvent).extra ?? updated[existingIdx].extra,
                };
                return updated;
              }
              return [
                ...prev,
                {
                  id: stepIdRef.current++,
                  icon: step.icon || "🤖",
                  title: step.title || "步骤",
                  subtitle: step.subtitle || "",
                  detail: step.detail || "",
                  status: (step.status as PipelineStep["status"]) || "running",
                  extra: (step as AgentStepEvent).extra,
                },
              ];
            });
          }
        },
        onError: (errMsg) => {
          setError(errMsg);
        },
        onDone: (finalContent: string) => {
          if (finalContent || pipelineSteps.length > 0) {
            addMessage({
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: finalContent || "（Agent 已完成分析）",
            });
          } else {
            addMessage({
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "抱歉，未收到有效回复，请稍后重试。",
            });
          }
          setStreamingContent("");
          setLoading(false);
        },
      }
    );
  }, [input, isLoading, addMessage, setLoading]);

  const handleStop = () => {
    abortRef.current?.abort();
    if (streamingContent) {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: streamingContent + "\n\n*[用户中断了回复]*",
      });
    }
    setStreamingContent("");
    setPipelineSteps([]);
    setLoading(false);
  };

  const handleReset = () => {
    if (isLoading) abortRef.current?.abort();
    reset();
    setStreamingContent("");
    setPipelineSteps([]);
    setError(null);
  };

  return (
    <>
      <Header title="AI 助手" subtitle="智能病害分析与养护建议" />
      <div className="flex-1 overflow-hidden flex flex-col p-6">
        <Card className="flex-1 flex flex-col overflow-hidden">

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-gray-700">道路病害智能助手</h4>
              {isLoading && (
                <span className="text-xs text-blue-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  分析中
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pipelineSteps.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTrace((v) => !v)}
                  className="h-7 text-xs gap-1"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  {showTrace ? "隐藏" : "显示"}执行流程
                  {showTrace ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
                <RotateCcw className="h-3 w-3" />
                新对话
              </Button>
            </div>
          </div>

          {/* ── Trace / Waterfall ── */}
          {showTrace && pipelineSteps.length > 0 && (
            <div className="max-h-80 overflow-y-auto shrink-0">
              <TraceBlock steps={pipelineSteps} />
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  您好，我是道路病害智能助手
                </h3>
                <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                  我可以帮您分析检测数据、诊断病害类型、了解修复方案、查询历史记录
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-left max-w-sm">
                  {[
                    "最近检测到了哪些病害？",
                    "D00 纵向裂缝怎么修复？",
                    "龟裂的成因是什么？",
                    "帮我分析检测统计数据",
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                      className="text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors border border-gray-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex items-start gap-3", msg.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                    msg.role === "user" ? "bg-blue-600" : "bg-gray-100"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming content */}
            {isLoading && streamingContent && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 shrink-0">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm text-gray-800">
                  <pre className="whitespace-pre-wrap">{streamingContent}</pre>
                  <span className="inline-block ml-1 animate-pulse text-gray-400">▌</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 shrink-0">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="p-4 border-t border-gray-100 shrink-0">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                placeholder="输入消息，例如：最近检测到了哪些病害？"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
                className="flex-1"
              />
              {isLoading ? (
                <Button onClick={handleStop} variant="outline" className="gap-1.5">
                  <XCircle className="h-4 w-4" />
                  停止
                </Button>
              ) : (
                <Button onClick={handleSend} disabled={!input.trim()} className="gap-1.5">
                  发送
                </Button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              AI 助手会调用工具访问真实数据，请基于病害检测系统回答
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
