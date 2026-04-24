"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { FileText, Download, Plus, Check, AlertCircle } from "lucide-react";

interface Report {
  id: number;
  title: string;
  report_type: string;
  file_path: string;
  content_summary?: string;
  ai_analysis?: string;
  is_generated: boolean;
  created_at: string;
}

interface DetectionRecord {
  id: number;
  filename: string;
  file_type: string;
  total_count: number;
  avg_confidence: number;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  
  // 创建报告弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("pdf");
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [includeAI, setIncludeAI] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadReports = () => {
    setLoading(true);
    api.reports.list({ limit: 50 })
      .then((data: { items: Report[] }) => setReports(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadRecords = () => {
    setRecordsLoading(true);
    api.history.list({ limit: 100 })
      .then((data: { items: DetectionRecord[] }) => setRecords(data.items || []))
      .catch(() => {})
      .finally(() => setRecordsLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      loadRecords();
    }
  }, [dialogOpen]);

  const handleOpenDialog = () => {
    setTitle(`检测报告_${new Date().toLocaleDateString('zh-CN')}`);
    setSelectedRecords([]);
    setIncludeAI(false);
    setDialogOpen(true);
  };

  const handleRecordToggle = (recordId: number) => {
    setSelectedRecords(prev => 
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(r => r.id));
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.reports.create({
        title: title.trim(),
        report_type: reportType,
        record_ids: selectedRecords.length > 0 ? selectedRecords : undefined,
        include_ai_analysis: includeAI,
      });
      setDialogOpen(false);
      setTitle("");
      setSelectedRecords([]);
      loadReports();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!confirm("确定要删除这份报告吗？")) return;
    try {
      await api.reports.delete(reportId);
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const typeLabels: Record<string, string> = {
    pdf: "PDF",
    word: "Word",
    excel: "Excel",
  };

  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-700",
    word: "bg-blue-100 text-blue-700",
    excel: "bg-green-100 text-green-700",
  };

  const typeIcons: Record<string, string> = {
    pdf: "📄",
    word: "📝",
    excel: "📊",
  };

  return (
    <>
      <Header title="报告管理" subtitle="生成和下载检测报告" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 创建报告卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              生成新报告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenDialog}>
                  <Plus className="h-4 w-4" />
                  创建报告
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>创建检测报告</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* 报告标题 */}
                  <div className="space-y-2">
                    <Label htmlFor="title">报告标题</Label>
                    <Input
                      id="title"
                      placeholder="输入报告标题..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* 报告类型 */}
                  <div className="space-y-2">
                    <Label>报告格式</Label>
                    <div className="flex gap-3">
                      {[
                        { value: "pdf", label: "PDF", desc: "适合打印存档" },
                        { value: "word", label: "Word", desc: "适合编辑分享" },
                        { value: "excel", label: "Excel", desc: "适合数据分析" },
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setReportType(type.value)}
                          className={`flex-1 p-3 rounded-lg border-2 transition-all text-left ${
                            reportType === type.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{typeIcons[type.value]}</span>
                            <span className="font-medium">{type.label}</span>
                            {reportType === type.value && (
                              <Check className="h-4 w-4 text-blue-500 ml-auto" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{type.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 选择检测记录 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>选择检测记录（可选）</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleSelectAll}
                        >
                          {selectedRecords.length === records.length ? "取消全选" : "全选"}
                        </Button>
                        <span className="text-sm text-gray-500">
                          已选 {selectedRecords.length} 条
                        </span>
                      </div>
                    </div>
                    
                    {recordsLoading ? (
                      <div className="py-8 text-center text-gray-500">
                        <Loading message="加载检测记录..." />
                      </div>
                    ) : records.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>暂无检测记录</p>
                        <p className="text-xs mt-1">请先进行检测后再生成报告</p>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        {records.map((record) => (
                          <div
                            key={record.id}
                            className={`flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                              selectedRecords.includes(record.id) ? "bg-blue-50" : ""
                            }`}
                            onClick={() => handleRecordToggle(record.id)}
                          >
                            <Checkbox
                              checked={selectedRecords.includes(record.id)}
                              onCheckedChange={() => handleRecordToggle(record.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {record.filename}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.file_type === "image" ? "图片" : "视频"} | 
                                病害: {record.total_count} | 
                                置信度: {(record.avg_confidence * 100).toFixed(1)}% |
                                {new Date(record.created_at).toLocaleDateString('zh-CN')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI 分析选项 */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ai"
                      checked={includeAI}
                      onCheckedChange={(checked) => setIncludeAI(checked as boolean)}
                    />
                    <Label htmlFor="ai" className="cursor-pointer">
                      包含 AI 智能分析建议
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      需要配置 DeepSeek API
                    </Badge>
                  </div>

                  {/* 报告预览信息 */}
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <h4 className="font-medium mb-2">报告将包含：</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• 报告基本信息（编号、时间）</li>
                      <li>• 检测概况统计（总数、置信度）</li>
                      <li>• 病害类型分布</li>
                      <li>• 严重程度分布</li>
                      {selectedRecords.length > 0 && (
                        <li>• {selectedRecords.length} 条检测记录详情</li>
                      )}
                      {includeAI && (
                        <li>• AI 智能分析建议</li>
                      )}
                    </ul>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={creating || !title.trim()}
                  >
                    {creating ? (
                      <>
                        <Loading className="h-4 w-4 mr-2" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        生成报告
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* 报告列表 */}
        <Card>
          <CardHeader>
            <CardTitle>报告列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loading message="加载报告..." />
            ) : reports.length === 0 ? (
              <EmptyState
                title="暂无报告"
                description="创建检测报告后，将显示在这里"
              />
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 shrink-0">
                      <span className="text-lg">{typeIcons[report.report_type] || "📄"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(report.created_at).toLocaleString("zh-CN")}
                        {report.content_summary && (
                          <span className="ml-2">| {report.content_summary}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.ai_analysis && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          AI 分析
                        </Badge>
                      )}
                      <Badge className={typeColors[report.report_type] || "bg-gray-100 text-gray-700"}>
                        {typeLabels[report.report_type] || report.report_type}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <a href={api.reports.download(report.id)} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
