"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import { Loading } from "@/components/shared/loading";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Activity,
  Camera,
  Video,
  BarChart3,
  Shield,
  Crosshair,
  Layers,
  Settings2,
  AlertCircle,
  Database,
  Timer,
  CheckCircle2,
} from "lucide-react";

interface TrendData {
  date: string;
  count: number;
}

function MetricTile({
  label,
  value,
  unit,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  unit?: string;
  trend?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className={`p-2 rounded-md ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-gray-900">{value}</span>
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-emerald-600' : 'text-gray-400'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
        <span className="text-xs font-semibold text-gray-800">{value}</span>
      </div>
    </div>
  );
}

function DetectionItem({ label, code, status }: { label: string; code: string; status: 'active' | 'idle' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-sm ${status === 'active' ? 'bg-blue-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-xs font-mono text-gray-400">{code}</span>
    </div>
  );
}

export default function HomePage() {
  const [overview, setOverview] = useState<{
    total_records: number;
    total_detections: number;
    total_images: number;
    total_videos: number;
    avg_confidence: number;
    detection_trend: TrendData[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats
      .overview()
      .then(setOverview)
      .catch(() =>
        setOverview({
          total_records: 0,
          total_detections: 0,
          total_images: 0,
          total_videos: 0,
          avg_confidence: 0,
          detection_trend: [],
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const sampleTrendData = overview?.detection_trend && overview.detection_trend.length > 0
    ? overview.detection_trend
    : [
        { date: "周一", count: 12 },
        { date: "周二", count: 19 },
        { date: "周三", count: 15 },
        { date: "周四", count: 25 },
        { date: "周五", count: 32 },
        { date: "周六", count: 18 },
        { date: "周日", count: 10 },
      ];

  return (
    <>
      <Header title="首页概览" subtitle="道路病害智能检测系统" />
      <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">道路病害智能检测系统</h3>
            <p className="text-sm text-gray-500 mt-1">
              基于 YOLO11n 模型 | 支持图片与视频分析
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">系统运行正常</span>
          </div>
        </div>

        {loading ? (
          <Loading message="正在加载数据..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <MetricTile
              label="检测记录总数"
              value={overview?.total_records ?? 0}
              icon={Activity}
              color="bg-blue-600"
              trend="+5.2%"
            />
            <MetricTile
              label="病害目标总数"
              value={overview?.total_detections ?? 0}
              icon={Shield}
              color="bg-emerald-600"
            />
            <MetricTile
              label="图片检测数"
              value={overview?.total_images ?? 0}
              icon={Camera}
              color="bg-purple-600"
            />
            <MetricTile
              label="视频检测数"
              value={overview?.total_videos ?? 0}
              icon={Video}
              color="bg-orange-600"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                    近 7 日检测趋势
                  </h4>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sampleTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-gray-500" />
                系统配置
              </h4>
              <div className="space-y-3">
                <StatusBadge label="模型状态" value="YOLO11n" active={true} />
                <StatusBadge label="平均置信度" value={`${overview?.avg_confidence ?? 0}%`} active={true} />
                <StatusBadge label="后端服务" value="已连接" active={true} />
                <StatusBadge label="当前任务" value="空闲" />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">处理参数</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IoU 阈值</span>
                    <span className="font-mono text-gray-800">0.45</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">置信度阈值</span>
                    <span className="font-mono text-gray-800">0.25</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">最大检测数</span>
                    <span className="font-mono text-gray-800">300</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-500" />
                检测工作流
              </h4>
              <div className="space-y-1">
                <DetectionItem label="上传媒体" code="图片 / 视频" status="active" />
                <DetectionItem label="参数配置" code="IoU / 置信度" status="idle" />
                <DetectionItem label="模型推理" code="YOLO11n" status="idle" />
                <DetectionItem label="数据存储" code="数据库" status="idle" />
                <DetectionItem label="报告导出" code="PDF / Word" status="idle" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-gray-500" />
                支持的病害类型
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <DetectionItem label="纵向裂缝" code="D00 / D01" status="active" />
                <DetectionItem label="横向裂缝" code="D10 / D11" status="active" />
                <DetectionItem label="龟裂/网裂" code="D20" status="active" />
                <DetectionItem label="坑洞/块裂" code="D40" status="active" />
                <DetectionItem label="井盖沉降" code="D43" status="idle" />
                <DetectionItem label="车辙" code="D44" status="idle" />
                <DetectionItem label="障碍物" code="D50" status="idle" />
                <DetectionItem label="模型精度" code="mAP: 50.2%" status="idle" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
