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
  ChevronRight, Info, BarChart2, BookOpen, Sparkles
} from "lucide-react";
import type {
  GraphNodeResponse, GraphLinkResponse, EntityDetail,
  EntityListItem, SemanticSearchResult, GraphStatistics,
  TypeInfo
} from "@/lib/api-types";

const ENTITY_COLORS: Record<string, string> = {
  Disease: "#3b82f6", Cause: "#ef4444", Repair: "#10b981",
  Material: "#f59e0b", Standard: "#8b5cf6", Component: "#06b6d4",
  Risk: "#ec4899", Region: "#84cc16", Obstacle: "#f97316",
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
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ entities: number; relations: number } | null>(null);

  const [types, setTypes] = useState<{ entity_types: TypeInfo[] } | null>(null);

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 800, height: 600 });

  // 加载图谱
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

  // 初始化图谱
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

  // 加载统计
  const loadStats = async () => {
    try {
      const data = await api.kg2.statistics();
      setStats(data);
    } catch {}
  };

  // 加载类型
  const loadTypes = async () => {
    try {
      const data = await api.kg2.types();
      setTypes(data);
    } catch {}
  };

  // 加载实体列表
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

  // 监听容器大小
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

  // 节点点击
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

  // 搜索
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

  // 上传文本文档
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

  // 删除实体
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

  // 从搜索结果点击跳转
  const handleSearchResultClick = async (result: SemanticSearchResult) => {
    const node = nodes.find((n) => n.id === result.id);
    if (node) {
      handleNodeClick(node);
    } else {
      // 从API获取详情
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

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 顶部统计卡片 */}
        {stats && stats.total_entities > 0 && (
          <div className="grid grid-cols-6 gap-4">
            <StatCard label="总实体" value={stats.total_entities} color="blue" />
            <StatCard label="总关系" value={stats.total_relations} color="purple" />
            <StatCard label="病害类型" value={stats.type_distribution?.Disease || 0} color="blue" />
            <StatCard label="成因类型" value={stats.type_distribution?.Cause || 0} color="red" />
            <StatCard label="维修方法" value={stats.type_distribution?.Repair || 0} color="green" />
            <StatCard label="材料标准" value={(stats.type_distribution?.Material || 0) + (stats.type_distribution?.Standard || 0)} color="amber" />
          </div>
        )}

        <Tabs defaultValue="graph" className="flex-1 flex flex-col">
          <div className="px-6 pb-0">
            <TabsList>
              <TabsTrigger value="graph"><Layers className="h-4 w-4 mr-1" />图谱视图</TabsTrigger>
              <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />智能搜索</TabsTrigger>
              <TabsTrigger value="entities"><BookOpen className="h-4 w-4 mr-1" />实体管理</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-1" />知识文档</TabsTrigger>
            </TabsList>
          </div>

          {/* 图谱视图 */}
          <TabsContent value="graph" className="flex-1 overflow-hidden">
            <div className="h-full flex gap-6">
              {/* 图谱区域 */}
              <Card className="flex-1 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-500" />
                      病害关系知识图谱
                    </CardTitle>
                    <div className="flex gap-3 items-center">
                      {/* 图例 */}
                      <div className="flex gap-3 text-xs">
                        {entityTypes.slice(0, 6).map((t) => (
                          <div key={t.type} className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="text-gray-500">{t.label}</span>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={handleInit} disabled={initLoading}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${initLoading ? "animate-spin" : ""}`} />
                        {initLoading ? "初始化中..." : "初始化数据"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={loadGraph}>
                        <RefreshCw className="h-4 w-4 mr-1" />刷新
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]" ref={graphContainerRef}>
                  {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Layers className="h-16 w-16 mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">暂无图谱数据</p>
                      <p className="text-sm mb-4">点击上方"初始化数据"按钮加载预置知识图谱</p>
                      <Button onClick={handleInit} disabled={initLoading}>
                        <Sparkles className="h-4 w-4 mr-2" />
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
                </CardContent>
              </Card>

              {/* 详情面板 */}
              <Card className="w-96 shrink-0 overflow-auto">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    {selectedNode ? "节点详情" : "节点详情"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                    <div className="text-center text-gray-400 py-8">
                      <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">点击图谱中的节点查看详情</p>
                      <p className="text-xs mt-1">支持拖拽、缩放、点击交互</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 智能搜索 */}
          <TabsContent value="search" className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
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
                    {["纵向裂缝", "车辙 维修", "坑洞 沥青", "龟裂 基层", "井盖沉降"].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setSearchQuery(q); }}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {searchResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>搜索结果 ({searchResults.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {searchResults.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleSearchResultClick(r)}
                        className="p-4 rounded-lg border hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{r.name}</span>
                          <Badge style={{ backgroundColor: ENTITY_COLORS[r.entity_type] + "20", color: ENTITY_COLORS[r.entity_type] }}>
                            {ENTITY_LABELS[r.entity_type] || r.entity_type}
                          </Badge>
                          {r.code && <Badge variant="outline">{r.code}</Badge>}
                          <span className="ml-auto text-xs text-gray-400">匹配度: {r.score.toFixed(0)}</span>
                        </div>
                        {r.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">{r.description}</p>
                        )}
                        {r.cost_range && (
                          <p className="text-xs text-gray-400 mt-1">预估费用: {r.cost_range}</p>
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
                    <Input
                      placeholder="搜索实体..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="w-48"
                    />
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={entityTypeFilter}
                      onChange={(e) => { setEntityTypeFilter(e.target.value); setEntityPage(1); }}
                    >
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
                <div className="space-y-2">
                  {entityList.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group"
                      onClick={() => handleNodeClick({
                        id: e.id, name: e.name, entity_type: e.entity_type,
                        code: e.code, description: e.description,
                        severity_level: e.severity_level, cost_range: e.cost_range,
                        priority: e.priority, symbolSize: 30,
                        color: ENTITY_COLORS[e.entity_type],
                      })}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ENTITY_COLORS[e.entity_type] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{e.name}</span>
                          {e.code && <Badge variant="outline" className="text-xs">{e.code}</Badge>}
                          <span className="text-xs text-gray-400">{ENTITY_LABELS[e.entity_type] || e.entity_type}</span>
                        </div>
                        {e.description && (
                          <p className="text-xs text-gray-400 truncate">{e.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="opacity-0 group-hover:opacity-100 text-red-500"
                        onClick={(e_) => { e_.stopPropagation(); handleDeleteEntity(e.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {entityTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button size="sm" variant="outline" disabled={entityPage <= 1}
                      onClick={() => loadEntities(entityPage - 1)}>上一页</Button>
                    <span className="text-sm text-gray-500 self-center">
                      第 {entityPage} 页，共 {Math.ceil(entityTotal / 20)} 页
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
                  <Button onClick={() => setShowUpload(true)}>
                    <Plus className="h-4 w-4 mr-2" />添加文档
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                  <p className="font-medium mb-1">文档上传说明</p>
                  <p>上传道路病害相关文章或文本，系统将自动使用 AI 抽取其中的实体和关系，构建知识图谱。</p>
                  <p className="mt-2 text-xs">支持格式：TXT、Markdown、HTML。也可直接粘贴文本内容。</p>
                </div>
                {uploadResult && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg text-sm text-green-700">
                    <p className="font-medium">导入成功！</p>
                    <p>抽取了 {uploadResult.entities} 个实体，{uploadResult.relations} 条关系</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 上传文档对话框 */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加知识文档</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">文档标题</label>
              <Input
                placeholder="例如：高速公路沥青路面养护技术指南"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">文档内容</label>
              <textarea
                className="w-full h-64 border rounded-lg p-3 text-sm resize-none font-mono"
                placeholder="粘贴文章内容或技术文档..."
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
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
            <Button onClick={handleUploadText} disabled={uploading || !uploadTitle.trim() || !uploadContent.trim()}>
              {uploading ? <Loading className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {uploading ? "分析中..." : "上传并抽取实体"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 统计卡片
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color] || colors.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </div>
  );
}

// 节点详情面板
function NodeDetailPanel({
  node, detail, onRelatedClick, onDelete
}: {
  node: GraphNodeResponse;
  detail: EntityDetail | null;
  onRelatedClick: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* 节点基本信息 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block px-2 py-0.5 rounded text-xs text-white font-medium"
            style={{ backgroundColor: ENTITY_COLORS[node.entity_type] || "#6b7280" }}
          >
            {ENTITY_LABELS[node.entity_type] || node.entity_type}
          </span>
          {node.code && (
            <Badge variant="outline" className="text-xs">{node.code}</Badge>
          )}
          <Button
            size="sm" variant="ghost"
            className="ml-auto text-red-500 hover:text-red-700 p-1 h-auto"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{node.name}</h3>
        {node.description && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{node.description}</p>
        )}
      </div>

      {/* 属性 */}
      {node.severity_level && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">风险等级</div>
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
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">预估费用范围</div>
          <div className="text-sm font-medium text-gray-700">{node.cost_range}</div>
        </div>
      )}

      {/* 出边关系 */}
      {detail && detail.outgoing_relations && detail.outgoing_relations.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            关联关系 ({detail.outgoing_relations.length + (detail.incoming_relations?.length || 0)})
          </div>
          <div className="space-y-2">
            {detail.outgoing_relations.map((r) => (
              <div
                key={r.id}
                onClick={() => onRelatedClick(r.target_id || (detail.related_entities?.find((e) => e.name === r.target_name)?.id || 0))}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">
                    {RELATION_LABELS[r.relation_type] || r.relation_type}
                  </div>
                  <div className="text-sm text-gray-700 truncate">{r.target_name}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </div>
            ))}
            {detail.incoming_relations?.map((r) => (
              <div
                key={r.id}
                onClick={() => onRelatedClick(r.source_id || (detail.related_entities?.find((e) => e.name === r.source_name)?.id || 0))}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-xs text-gray-500">
                    ← {RELATION_LABELS[r.relation_type] || r.relation_type}
                  </div>
                  <div className="text-sm text-gray-700 truncate">{r.source_name}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 相关实体 */}
      {detail && detail.related_entities && detail.related_entities.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">相关实体</div>
          <div className="flex flex-wrap gap-1">
            {detail.related_entities.map((e) => (
              <Badge
                key={e.id}
                style={{ backgroundColor: ENTITY_COLORS[e.type] + "15", color: ENTITY_COLORS[e.type] }}
                className="cursor-pointer hover:opacity-80 text-xs"
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
