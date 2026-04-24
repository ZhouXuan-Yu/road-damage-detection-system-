"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { GraphChart } from "@/components/knowledge/graph-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Plus, Trash2, RefreshCw, Upload, FileText, Layers,
  ChevronRight, Info, BarChart2, BookOpen, Sparkles, Network,
  Database, GitBranch, FileUp
} from "lucide-react";
import type {
  GraphNodeResponse, GraphLinkResponse, EntityDetail,
  EntityListItem, SemanticSearchResult, GraphStatistics,
  TypeInfo
} from "@/lib/api-types";

const ENTITY_COLORS: Record<string, string> = {
  Disease: "#3b82f6", Cause: "#dc2626", Repair: "#16a34a",
  Material: "#d97706", Standard: "#7c3aed", Component: "#0891b2",
  Risk: "#db2777", Region: "#65a30d", Obstacle: "#ea580c",
};

const ENTITY_LABELS: Record<string, string> = {
  Disease: "病害", Cause: "成因", Repair: "维修方法",
  Material: "材料", Standard: "技术标准", Component: "道路构件",
  Risk: "风险等级", Region: "区域/路段", Obstacle: "障碍物",
};

const RELATION_LABELS: Record<string, string> = {
  CAUSED_BY: "由...引起", LEADS_TO: "会导致", TREATED_BY: "由...维修",
  USES_MATERIAL: "使用材料", AFFECTS_COMPONENT: "影响构件", RELATED_TO: "相关",
  OCCURS_IN: "发生于", CO_OCCURS: "伴随发生", APPLIES_STANDARD: "依据标准",
};

export default function KnowledgePage() {
  const [nodes, setNodes] = useState<GraphNodeResponse[]>([]);
  const [links, setLinks] = useState<GraphLinkResponse[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeResponse | null>(null);
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [stats, setStats] = useState<GraphStatistics | null>(null);
  const [entityList, setEntityList] = useState<EntityListItem[]>([]);
  const [entityTotal, setEntityTotal] = useState(0);
  const [entityPage, setEntityPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [entitySearch, setEntitySearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ entities: number; relations: number } | null>(null);

  const [types, setTypes] = useState<{ entity_types: TypeInfo[] } | null>(null);

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 800, height: 600 });

  const loadGraph = useCallback(async () => {
    try {
      const data = await api.kg2.graph({ depth: 2 });
      setNodes(data.nodes || []);
      setLinks(data.links || []);
    } catch {
      setNodes([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInit = async () => {
    setInitLoading(true);
    try {
      await api.kg2.init();
      await loadGraph();
      await loadStats();
    } catch (e) {
      console.error(e);
    } finally {
      setInitLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.kg2.statistics();
      setStats(data);
    } catch {}
  };

  const loadTypes = async () => {
    try {
      const data = await api.kg2.types();
      setTypes(data);
    } catch {}
  };

  const loadEntities = async (page = 1) => {
    try {
      const data = await api.kg2.entities({
        page, limit: 20, entity_type: entityTypeFilter || undefined, search: entitySearch || undefined
      });
      setEntityList(data.items || []);
      setEntityTotal(data.total || 0);
      setEntityPage(page);
    } catch {}
  };

  useEffect(() => {
    loadGraph();
    loadStats();
    loadTypes();
    loadEntities();
  }, []);

  useEffect(() => {
    if (!graphContainerRef.current) return;
    const update = () => {
      if (graphContainerRef.current) {
        setGraphSize({
          width: graphContainerRef.current.clientWidth,
          height: graphContainerRef.current.clientHeight,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(graphContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleNodeClick = async (node: GraphNodeResponse) => {
    setSelectedNode(node);
    setDetailLoading(true);
    try {
      const data = await api.kg2.entityDetail(node.id);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.kg2.search(searchQuery);
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUploadText = async () => {
    if (!uploadTitle.trim() || !uploadContent.trim()) return;
    setUploading(true);
    try {
      const result = await api.kg2.addTextDocument(uploadTitle, uploadContent, uploadCategory, true);
      setUploadResult({ entities: result.total_entities || 0, relations: result.total_relations || 0 });
      await loadGraph();
      await loadStats();
      await loadEntities();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEntity = async (id: number) => {
    if (!confirm("确定要删除这个实体吗？相关关系也会被删除。")) return;
    try {
      await api.kg2.deleteEntity(id);
      await loadGraph();
      await loadStats();
      await loadEntities();
      if (selectedNode?.id === id) {
        setSelectedNode(null);
        setDetail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchResultClick = async (result: SemanticSearchResult) => {
    const node = nodes.find((n) => n.id === result.id);
    if (node) {
      handleNodeClick(node);
    } else {
      setSelectedNode({
        id: result.id,
        name: result.name,
        entity_type: result.entity_type,
        code: result.code,
        description: result.description,
        severity_level: result.severity_level,
        cost_range: result.cost_range,
        priority: result.priority,
        symbolSize: 30,
        color: ENTITY_COLORS[result.entity_type],
      });
      try {
        const data = await api.kg2.entityDetail(result.id);
        setDetail(data);
      } catch {
        setDetail(null);
      }
    }
  };

  const entityTypes = types?.entity_types || [];

  if (loading) return <Loading message="加载知识图谱..." />;

  return (
    <>
      <Header title="知识图谱" subtitle="道路病害领域知识库与关系网络" />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 顶部统计 */}
        {stats && stats.total_entities > 0 && (
          <div className="px-6 pt-4 pb-0 shrink-0">
            <div className="grid grid-cols-6 gap-3">
              <StatCard label="总实体" value={stats.total_entities} color="blue" icon={<Database className="h-4 w-4" />} />
              <StatCard label="总关系" value={stats.total_relations} color="purple" icon={<GitBranch className="h-4 w-4" />} />
              <StatCard label="病害类型" value={stats.type_distribution?.Disease || 0} color="blue" icon={<Layers className="h-4 w-4" />} />
              <StatCard label="成因类型" value={stats.type_distribution?.Cause || 0} color="red" icon={<Info className="h-4 w-4" />} />
              <StatCard label="维修方法" value={stats.type_distribution?.Repair || 0} color="green" icon={<BarChart2 className="h-4 w-4" />} />
              <StatCard label="材料标准" value={(stats.type_distribution?.Material || 0) + (stats.type_distribution?.Standard || 0)} color="amber" icon={<Network className="h-4 w-4" />} />
            </div>
          </div>
        )}

        <Tabs defaultValue="graph" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 pb-0 shrink-0">
            <TabsList>
              <TabsTrigger value="graph"><Network className="h-4 w-4 mr-1" />图谱视图</TabsTrigger>
              <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />智能搜索</TabsTrigger>
              <TabsTrigger value="entities"><BookOpen className="h-4 w-4 mr-1" />实体管理</TabsTrigger>
              <TabsTrigger value="docs"><FileUp className="h-4 w-4 mr-1" />知识文档</TabsTrigger>
            </TabsList>
          </div>

          {/* 图谱视图 */}
          <TabsContent value="graph" className="flex-1 overflow-hidden px-6 pb-6">
            <div className="h-full flex gap-4">
              {/* 图谱主体 */}
              <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* 工具栏 */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shadow-sm">
                      <Network className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-800 tracking-wide">病害关系知识图谱</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {nodes.length > 0
                          ? `已加载 ${nodes.length} 个节点 · ${links.length} 条关系 · 可拖拽缩放`
                          : "道路病害领域实体关系可视化"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* 图例 */}
                    <div className="flex items-center gap-4 text-xs">
                      {entityTypes.slice(0, 5).map((t) => (
                        <div key={t.type} className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: t.color, boxShadow: `0 0 4px ${t.color}60` }}
                          />
                          <span className="text-gray-500 font-medium">{t.label}</span>
                        </div>
                      ))}
                      {entityTypes.length > 5 && (
                        <span className="text-gray-400">+{entityTypes.length - 5} 类</span>
                      )}
                    </div>
                    <div className="w-px h-5 bg-gray-200" />
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-gray-200" onClick={() => setShowDetailPanel(!showDetailPanel)}>
                      <Info className="h-3.5 w-3.5" />
                      {showDetailPanel ? "隐藏详情" : "显示详情"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300" onClick={handleInit} disabled={initLoading}>
                      <Sparkles className={`h-3.5 w-3.5 ${initLoading ? "animate-spin" : ""}`} />
                      {initLoading ? "初始化..." : "初始化数据"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={loadGraph}>
                      <RefreshCw className="h-3.5 w-3.5" />刷新
                    </Button>
                  </div>
                </div>

                {/* 图谱区域 */}
                <div className="flex-1 overflow-hidden" ref={graphContainerRef}>
                  {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full bg-slate-50">
                      <div className="w-24 h-24 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 shadow-inner">
                        <Network className="h-12 w-12 text-blue-300" />
                      </div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">知识图谱为空</p>
                      <p className="text-sm text-gray-400 mb-6 max-w-xs text-center">
                        点击下方按钮初始化道路病害领域预置知识图谱，即可查看病害、成因、维修方法等实体关系网络
                      </p>
                      <Button onClick={handleInit} disabled={initLoading} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Sparkles className="h-4 w-4" />
                        {initLoading ? "初始化中..." : "初始化知识图谱"}
                      </Button>
                    </div>
                  ) : (
                    <GraphChart
                      nodes={nodes}
                      links={links}
                      onNodeClick={handleNodeClick}
                      selectedNodeId={selectedNode?.id}
                      width={graphSize.width}
                      height={graphSize.height}
                    />
                  )}
                </div>

                {/* 底部状态栏 */}
                {nodes.length > 0 && (
                  <div className="px-5 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 shrink-0 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <span>节点: <span className="text-gray-600 font-medium">{nodes.length}</span></span>
                      <span>关系: <span className="text-gray-600 font-medium">{links.length}</span></span>
                      <span>类型: <span className="text-gray-600 font-medium">{entityTypes.length} 种</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span>实时监测 · 支持拖拽 · 双指缩放</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧详情面板 */}
              {showDetailPanel && (
                <div className="w-96 shrink-0 flex flex-col gap-4">
                  {/* 节点详情 */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                          <Info className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">节点详情</h3>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      {detailLoading ? (
                        <Loading message="加载详情..." />
                      ) : selectedNode ? (
                        <NodeDetailPanel
                          node={selectedNode}
                          detail={detail}
                          onRelatedClick={(id) => {
                            const n = nodes.find((x) => x.id === id);
                            if (n) handleNodeClick(n);
                          }}
                          onDelete={handleDeleteEntity}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                            <Layers className="h-8 w-8 text-slate-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">点击图谱节点查看详情</p>
                          <p className="text-xs text-gray-400 mt-1">支持拖拽、缩放、点击交互</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 关系类型说明 */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">关系类型说明</h4>
                    <div className="space-y-2">
                      {Object.entries(RELATION_LABELS).slice(0, 6).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: {
                              CAUSED_BY: "#dc2626", LEADS_TO: "#ea580c", TREATED_BY: "#16a34a",
                              USES_MATERIAL: "#d97706", AFFECTS_COMPONENT: "#0891b2", RELATED_TO: "#94a3b8",
                              OCCURS_IN: "#65a30d", CO_OCCURS: "#db2777", APPLIES_STANDARD: "#7c3aed",
                            }[key] || "#94a3b8" }}
                          />
                          <span className="text-xs text-gray-600">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

          {/* 智能搜索 */}
          <TabsContent value="search" className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-5">
              <Card>
                <CardHeader><CardTitle>语义搜索</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="输入关键词搜索，例如：裂缝、车辙、沥青..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="flex-1"
                    />
                    <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                      {searching ? <Loading className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                      搜索
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["纵向裂缝", "车辙 维修", "坑洞 沥青", "龟裂 基层", "井盖沉降", "沥青混凝土", "水损害"].map((q) => (
                      <button
                        key={q}
                        onClick={() => setSearchQuery(q)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-full text-gray-600 border border-transparent hover:border-blue-200 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {searchResults.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>搜索结果 ({searchResults.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {searchResults.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleSearchResultClick(r)}
                        className="p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ENTITY_COLORS[r.entity_type] }} />
                          <span className="font-semibold text-gray-900 text-sm">{r.name}</span>
                          <Badge
                            className="text-xs"
                            style={{ backgroundColor: ENTITY_COLORS[r.entity_type] + "15", color: ENTITY_COLORS[r.entity_type] }}
                          >
                            {ENTITY_LABELS[r.entity_type] || r.entity_type}
                          </Badge>
                          {r.code && <Badge variant="outline" className="text-xs">{r.code}</Badge>}
                          <span className="ml-auto text-xs text-gray-400 font-medium">匹配度: {r.score.toFixed(0)}</span>
                        </div>
                        {r.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 pl-4">{r.description}</p>
                        )}
                        {r.cost_range && (
                          <p className="text-xs text-gray-400 mt-1 pl-4">预估费用: {r.cost_range}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 实体管理 */}
          <TabsContent value="entities" className="flex-1 overflow-auto p-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>实体列表 ({entityTotal})</CardTitle>
                  <div className="flex gap-3 items-center">
                    <Input placeholder="搜索实体..." value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)} className="w-48" />
                    <select className="border rounded px-2 py-1.5 text-sm"
                      value={entityTypeFilter}
                      onChange={(e) => { setEntityTypeFilter(e.target.value); setEntityPage(1); }}>
                      <option value="">全部类型</option>
                      {entityTypes.map((t) => (
                        <option key={t.type} value={t.type}>{t.label}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => loadEntities(1)}>搜索</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {entityList.map((e) => (
                    <div key={e.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer group border border-transparent hover:border-gray-100 transition-all"
                      onClick={() => handleNodeClick({
                        id: e.id, name: e.name, entity_type: e.entity_type,
                        code: e.code, description: e.description,
                        severity_level: e.severity_level, cost_range: e.cost_range,
                        priority: e.priority, symbolSize: 30,
                        color: ENTITY_COLORS[e.entity_type],
                      })}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ENTITY_COLORS[e.entity_type], boxShadow: `0 0 4px ${ENTITY_COLORS[e.entity_type]}40` }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-800">{e.name}</span>
                          {e.code && <Badge variant="outline" className="text-xs">{e.code}</Badge>}
                          <Badge
                            className="text-xs"
                            style={{ backgroundColor: ENTITY_COLORS[e.entity_type] + "12", color: ENTITY_COLORS[e.entity_type] }}
                          >
                            {ENTITY_LABELS[e.entity_type] || e.entity_type}
                          </Badge>
                        </div>
                        {e.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{e.description}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost"
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={(e_) => { e_.stopPropagation(); handleDeleteEntity(e.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {entityTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-5">
                    <Button size="sm" variant="outline" disabled={entityPage <= 1}
                      onClick={() => loadEntities(entityPage - 1)}>上一页</Button>
                    <span className="text-sm text-gray-500 self-center">
                      第 {entityPage} / {Math.ceil(entityTotal / 20)} 页
                    </span>
                    <Button size="sm" variant="outline"
                      disabled={entityPage >= Math.ceil(entityTotal / 20)}
                      onClick={() => loadEntities(entityPage + 1)}>下一页</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 知识文档 */}
          <TabsContent value="docs" className="flex-1 overflow-auto p-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>知识文档管理</CardTitle>
                  <Button onClick={() => setShowUpload(true)} className="gap-2">
                    <FileUp className="h-4 w-4" />添加文档
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">AI 智能文档分析</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        上传道路病害相关文章或粘贴文本内容，系统将自动使用 <span className="text-blue-600 font-medium">DeepSeek AI</span> 抽取其中的病害实体和关系，自动构建知识图谱。
                      </p>
                      <p className="text-xs text-gray-400 mt-2">支持格式：TXT、Markdown、HTML，也可直接粘贴文本内容。</p>
                    </div>
                  </div>
                </div>
                {uploadResult && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="font-semibold text-green-700 text-sm">导入成功！</p>
                    <p className="text-xs text-green-600 mt-1">
                      抽取了 <span className="font-bold text-green-700">{uploadResult.entities}</span> 个实体，
                      <span className="font-bold text-green-700">{uploadResult.relations}</span> 条关系
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加知识文档</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">文档标题</label>
              <Input placeholder="例如：高速公路沥青路面养护技术指南" value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">文档内容</label>
              <textarea
                className="w-full h-64 border border-gray-200 rounded-xl p-3 text-sm resize-none font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="粘贴文章内容或技术文档..."
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">分类</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                <option value="general">通用</option>
                <option value="maintenance">养护技术</option>
                <option value="material">材料技术</option>
                <option value="standard">标准规范</option>
                <option value="case">案例分析</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>取消</Button>
            <Button onClick={handleUploadText} disabled={uploading || !uploadTitle.trim() || !uploadContent.trim()}
              className="gap-2">
              {uploading ? <Loading className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {uploading ? "分析中..." : "上传并抽取实体"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 统计卡片
function StatCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon?: React.ReactNode;
}) {
  const configs: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", icon: "text-blue-500" },
    purple: { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-600", icon: "text-purple-500" },
    green: { bg: "bg-green-50", border: "border-green-100", text: "text-green-600", icon: "text-green-500" },
    red: { bg: "bg-red-50", border: "border-red-100", text: "text-red-600", icon: "text-red-500" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", icon: "text-amber-500" },
  };
  const c = configs[color] || configs.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3.5 flex items-center gap-3`}>
      {icon && <div className={`${c.icon} shrink-0`}>{icon}</div>}
      <div className="min-w-0">
        <div className={`text-xl font-bold ${c.text} leading-tight`}>{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{label}</div>
      </div>
    </div>
  );
}

// 节点详情面板
function NodeDetailPanel({
  node, detail, onRelatedClick, onDelete,
}: {
  node: GraphNodeResponse;
  detail: EntityDetail | null;
  onRelatedClick: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: ENTITY_COLORS[node.entity_type] || "#6b7280" }}
          >
            {ENTITY_LABELS[node.entity_type] || node.entity_type}
          </span>
          {node.code && (
            <span className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200 text-xs font-mono text-gray-500">
              {node.code}
            </span>
          )}
          <Button size="sm" variant="ghost"
            className="ml-auto text-red-400 hover:text-red-600 hover:bg-red-50 p-1 h-auto"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <h3 className="text-base font-bold text-gray-900 leading-tight">{node.name}</h3>
        {node.description && (
          <p className="text-sm text-gray-500 mt-2.5 leading-relaxed">{node.description}</p>
        )}
      </div>

      {/* 属性信息 */}
      <div className="space-y-2">
        {node.severity_level && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-gray-400 shrink-0">风险等级</div>
            <Badge className={
              node.severity_level === "critical" ? "bg-red-100 text-red-700" :
              node.severity_level === "high" ? "bg-orange-100 text-orange-700" :
              node.severity_level === "medium" ? "bg-yellow-100 text-yellow-700" :
              "bg-green-100 text-green-700"
            }>
              {node.severity_level === "critical" ? "紧急" :
               node.severity_level === "high" ? "高" :
               node.severity_level === "medium" ? "中等" : "低"}
            </Badge>
          </div>
        )}

        {node.cost_range && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-gray-400 shrink-0">预估费用</div>
            <div className="text-sm font-semibold text-gray-700">{node.cost_range}</div>
          </div>
        )}
      </div>

      {/* 关联关系 */}
      {detail && (detail.outgoing_relations?.length > 0 || detail.incoming_relations?.length > 0) && (
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            关联关系 ({detail.outgoing_relations.length + (detail.incoming_relations?.length || 0)})
          </div>
          <div className="space-y-1.5">
            {detail.outgoing_relations.map((r) => {
              const targetEntity = detail.related_entities?.find((e) => e.name === r.target_name);
              return (
                <div key={r.id}
                  onClick={() => targetEntity && onRelatedClick(targetEntity.id)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100 hover:bg-blue-100 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 font-medium">{RELATION_LABELS[r.relation_type] || r.relation_type}</div>
                    <div className="text-sm text-gray-700 font-medium truncate">{r.target_name}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
                </div>
              );
            })}
            {detail.incoming_relations?.map((r) => {
              const sourceEntity = detail.related_entities?.find((e) => e.name === r.source_name);
              return (
                <div key={r.id}
                  onClick={() => sourceEntity && onRelatedClick(sourceEntity.id)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-xs text-gray-400 font-medium">← {RELATION_LABELS[r.relation_type] || r.relation_type}</div>
                    <div className="text-sm text-gray-700 font-medium truncate">{r.source_name}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 相关实体标签 */}
      {detail && detail.related_entities && detail.related_entities.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">相关实体</div>
          <div className="flex flex-wrap gap-1.5">
            {detail.related_entities.map((e) => (
              <Badge key={e.id}
                className="cursor-pointer hover:opacity-80 text-xs px-2 py-0.5"
                style={{ backgroundColor: (ENTITY_COLORS[e.type] || "#6b7280") + "15", color: ENTITY_COLORS[e.type] || "#6b7280" }}
                onClick={() => onRelatedClick(e.id)}
              >
                {e.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
