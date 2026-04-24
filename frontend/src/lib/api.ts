export interface AgentStepEvent {
  type: "step" | "step_update";
  icon?: string;
  title?: string;
  subtitle?: string;
  detail?: string;
  status?: string;
  extra?: {
    tool_name?: string;
    tool_args?: Record<string, unknown>;
    tool_result?: Record<string, unknown>;
    tool_ms?: number;
    [key: string]: unknown;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  detect: {
    image: (formData: FormData) =>
      fetchAPI("/api/v1/detect/image", {
        method: "POST",
        body: formData,
      }),
    video: (formData: FormData) =>
      fetchAPI("/api/v1/detect/video", {
        method: "POST",
        body: formData,
      }),
    getClasses: () => fetchAPI("/api/v1/detect/classes"),
    getResult: (taskId: string) => fetchAPI(`/api/v1/detect/result/${taskId}`),
  },
  history: {
    list: (params: { page?: number; limit?: number; file_type?: string; search?: string } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.file_type) searchParams.set("file_type", params.file_type);
      if (params.search) searchParams.set("search", params.search);
      return fetchAPI(`/api/v1/history?${searchParams.toString()}`);
    },
    detail: (id: number) => fetchAPI(`/api/v1/history/${id}`),
  },
  stats: {
    overview: () => fetchAPI("/api/v1/stats/overview"),
    distribution: () => fetchAPI("/api/v1/stats/distribution"),
    timeline: (days?: number) =>
      fetchAPI(`/api/v1/stats/timeline${days ? `?days=${days}` : ""}`),
    severity: () => fetchAPI("/api/v1/stats/severity"),
    topDamageTypes: (limit?: number) =>
      fetchAPI(`/api/v1/stats/top-damage-types${limit ? `?limit=${limit}` : ""}`),
    confidenceTrend: (weeks?: number) =>
      fetchAPI(`/api/v1/stats/confidence-trend${weeks ? `?weeks=${weeks}` : ""}`),
    calendarHeatmap: (year?: number) =>
      fetchAPI(`/api/v1/stats/calendar-heatmap${year ? `?year=${year}` : ""}`),
    monthlyTrend: (months?: number) =>
      fetchAPI(`/api/v1/stats/monthly-trend${months ? `?months=${months}` : ""}`),
    repairProgress: () => fetchAPI("/api/v1/stats/repair-progress"),
  },
  agent: {
    chat: (message: string, sessionId?: string) =>
      fetchAPI("/api/v1/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
      }),
    /**
     * Streaming chat via SSE.
     * @param message - User message
     * @param sessionId - Optional conversation session ID
     * @param callbacks - Event callbacks for SSE events
     * @returns AbortController for cancellation
     */
    chatStream: (
      message: string,
      sessionId?: string,
      callbacks?: {
        onContent?: (content: string) => void;
        onStep?: (step: AgentStepEvent) => void;
        onDone?: (finalContent: string) => void;
        onError?: (error: string) => void;
      }
    ): AbortController => {
      const controller = new AbortController();
      const url = `${API_BASE}/api/v1/agent/chat/stream`;
      const body = JSON.stringify({ message, session_id: sessionId });
      let accumulatedContent = "";

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) {
            callbacks?.onError?.(`请求失败: ${res.status}`);
            callbacks?.onDone?.(accumulatedContent);
            return;
          }
          const reader = res.body?.getReader();
          if (!reader) {
            callbacks?.onError?.("无法读取响应流");
            callbacks?.onDone?.(accumulatedContent);
            return;
          }
          const decoder = new TextDecoder();
          let buffer = "";

          function processBuffer(): boolean {
            // Parse complete SSE records: lines ending with blank line = one record
            const recordMatch = buffer.match(/^data: (.+?)\n\n(.*)$/s);
            if (!recordMatch) return false;

            const eventData = recordMatch[1];
            buffer = recordMatch[2];

            try {
              const data = JSON.parse(eventData);
              console.log("[SSE] type:", data.type, "data:", JSON.stringify(data).substring(0, 200));
              switch (data.type) {
                case "content":
                  accumulatedContent += data.content;
                  callbacks?.onContent?.(data.content);
                  break;
                case "step":
                case "step_update":
                  callbacks?.onStep?.(data);
                  break;
                case "error":
                  callbacks?.onError?.(data.message || "未知错误");
                  break;
                case "done":
                  callbacks?.onDone?.(accumulatedContent);
                  return true;
              }
            } catch {
              // ignore parse errors for malformed chunks
            }
            return false;
          }

          function read() {
            reader!.read().then(({ done, value }) => {
              if (done) {
                // Process any remaining content in buffer
                if (buffer.trim()) {
                  try {
                    const data = JSON.parse(buffer.trim().replace(/^data: /, ""));
                    if (data.type === "content") {
                      accumulatedContent += data.content;
                      callbacks?.onContent?.(data.content);
                    } else if (data.type === "step" || data.type === "step_update") {
                      callbacks?.onStep?.(data);
                    } else if (data.type === "error") {
                      callbacks?.onError?.(data.message || "未知错误");
                    }
                  } catch {
                    // ignore
                  }
                }
                callbacks?.onDone?.(accumulatedContent);
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              // Keep processing complete records until we have an incomplete one
              while (processBuffer()) { /* keep going */ }
              read();
            });
          }
          read();
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          callbacks?.onError?.(err.message);
          callbacks?.onDone?.(accumulatedContent);
        });

      return controller;
    },
  },
  reports: {
    list: (params: { page?: number; limit?: number } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      return fetchAPI(`/api/v1/reports?${searchParams.toString()}`);
    },
    create: (data: { 
      title: string; 
      report_type: string; 
      record_ids?: number[];
      include_ai_analysis?: boolean;
    }) =>
      fetchAPI("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    download: (id: number) => `${API_BASE}/api/v1/reports/${id}/download`,
    delete: (id: number) =>
      fetchAPI(`/api/v1/reports/${id}`, {
        method: "DELETE",
      }),
  },
  kg: {
    // 知识库 CRUD
    list: (params: { page?: number; limit?: number; search?: string } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.search) searchParams.set("search", params.search);
      return fetchAPI(`/api/v1/kg/knowledge?${searchParams.toString()}`);
    },
    get: (code: string) => fetchAPI(`/api/v1/kg/knowledge/${code}`),
    create: (data: Record<string, unknown>) =>
      fetchAPI("/api/v1/kg/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (code: string, data: Record<string, unknown>) =>
      fetchAPI(`/api/v1/kg/knowledge/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (code: string) =>
      fetchAPI(`/api/v1/kg/knowledge/${code}`, { method: "DELETE" }),
    // 图谱
    graph: () => fetchAPI("/api/v1/kg/graph"),
    disease: (id: string) => fetchAPI(`/api/v1/kg/disease/${id}`),
  },
  // 知识图谱 v2
  kg2: {
    // 初始化
    init: () => fetchAPI("/api/v1/kg2/init", { method: "POST" }),
    // 实体管理
    entities: (params?: { page?: number; limit?: number; entity_type?: string; search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.set("page", String(params.page));
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.entity_type) sp.set("entity_type", params.entity_type);
      if (params?.search) sp.set("search", params.search);
      return fetchAPI(`/api/v1/kg2/entities?${sp.toString()}`);
    },
    createEntity: (data: Record<string, unknown>) =>
      fetchAPI("/api/v1/kg2/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateEntity: (id: number, data: Record<string, unknown>) =>
      fetchAPI(`/api/v1/kg2/entities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    deleteEntity: (id: number) =>
      fetchAPI(`/api/v1/kg2/entities/${id}`, { method: "DELETE" }),
    // 实体详情
    entityDetail: (id: number) => fetchAPI(`/api/v1/kg2/entities/${id}`),
    // 图谱
    graph: (params?: { center?: string; depth?: number; entity_type?: string }) => {
      const sp = new URLSearchParams();
      if (params?.center) sp.set("center", params.center);
      if (params?.depth) sp.set("depth", String(params.depth));
      if (params?.entity_type) sp.set("entity_type", params.entity_type);
      return fetchAPI(`/api/v1/kg2/graph?${sp.toString()}`);
    },
    entityGraph: (id: number, depth?: number) =>
      fetchAPI(`/api/v1/kg2/entity/${id}/graph${depth ? `?depth=${depth}` : ""}`),
    // 关系
    createRelation: (data: { source_name: string; target_name: string; relation_type: string; weight?: number }) =>
      fetchAPI("/api/v1/kg2/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    deleteRelation: (id: number) =>
      fetchAPI(`/api/v1/kg2/relations/${id}`, { method: "DELETE" }),
    // 语义搜索
    search: (query: string, topK?: number, entityType?: string) =>
      fetchAPI("/api/v1/kg2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: topK || 5, entity_type: entityType }),
      }),
    related: (id: number, depth?: number) =>
      fetchAPI(`/api/v1/kg2/entity/${id}/related${depth ? `?depth=${depth}` : ""}`),
    // 统计
    statistics: () => fetchAPI("/api/v1/kg2/statistics"),
    types: () => fetchAPI("/api/v1/kg2/types"),
    // 文档
    documents: (params?: { page?: number; limit?: number; category?: string; search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.set("page", String(params.page));
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.category) sp.set("category", params.category);
      if (params?.search) sp.set("search", params.search);
      return fetchAPI(`/api/v1/kg2/documents?${sp.toString()}`);
    },
    uploadDocument: async (file: File, title: string, category: string) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("category", category);
      const res = await fetch(`${API_BASE}/api/v1/kg2/documents/upload?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`, {
        method: "POST",
        body: formData,
      });
      return res.json();
    },
    addTextDocument: (title: string, content: string, category?: string, extract?: boolean) =>
      fetchAPI("/api/v1/kg2/documents/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category: category || "general", extract: extract !== false }),
      }),
    deleteDocument: (id: number) =>
      fetchAPI(`/api/v1/kg2/documents/${id}`, { method: "DELETE" }),
    reextractDocument: (id: number) =>
      fetchAPI(`/api/v1/kg2/documents/${id}/extract`, { method: "POST" }),
  },
};
