"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/loading";
import { api } from "@/lib/api";
import ReactECharts from "echarts-for-react";
import {
  Activity,
  TrendingUp,
  Camera,
  Video,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface OverviewData {
  total_records: number;
  total_detections: number;
  total_images: number;
  total_videos: number;
  avg_confidence: number;
}

interface DistributionItem {
  name: string;
  value: number;
}

interface SeverityItem {
  severity: string;
  count: number;
  percentage: number;
}

interface TopDamageItem {
  class_name: string;
  count: number;
  percentage: number;
}

interface ConfidenceItem {
  week: string;
  avg_confidence: number;
  count: number;
}

interface MonthlyItem {
  month: string;
  images: number;
  videos: number;
  total: number;
}

function StatisticCard({
  title,
  value,
  unit,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className={`p-5 bg-white border border-gray-200 rounded-lg ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <div className="p-1.5 bg-white/10 rounded-md">
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-xs text-white/80">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-xs text-white/90">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export default function StatisticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [severity, setSeverity] = useState<SeverityItem[]>([]);
  const [topDamage, setTopDamage] = useState<TopDamageItem[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceItem[]>([]);
  const [monthly, setMonthly] = useState<MonthlyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("近30天");
  const [selectedType, setSelectedType] = useState("全部");

  useEffect(() => {
    loadData();
  }, [dateRange, selectedType]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.stats.overview(),
      api.stats.distribution(),
      api.stats.severity().catch(() => ({ items: [] })),
      api.stats.topDamageTypes(5).catch(() => ({ items: [] })),
      api.stats.confidenceTrend(12).catch(() => ({ items: [] })),
      api.stats.monthlyTrend(6).catch(() => ({ items: [] })),
    ])
      .then(([ov, dist, sev, top, conf, month]) => {
        setOverview(ov);
        setDistribution(dist.items || []);
        setSeverity(sev.items || []);
        setTopDamage(top.items || []);
        setConfidence(conf.items || []);
        setMonthly(month.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  if (loading) return <Loading message="正在加载统计数据..." />;

  const pieOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
      textStyle: { color: "#6b7280", fontSize: 12 },
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: false },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0, 0, 0, 0.5)" },
        },
        data: distribution.length > 0 ? distribution : [
          { name: "纵向裂缝", value: 45 },
          { name: "横向裂缝", value: 30 },
          { name: "龟裂", value: 15 },
          { name: "坑洞", value: 10 },
        ],
      },
    ],
    color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
  };

  const barOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>检测次数: <strong>${item.value}</strong> 次`;
      },
    },
    grid: { left: "3%", right: "8%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: topDamage.length > 0 ? topDamage.map((d) => d.class_name) : ["纵向裂缝", "横向裂缝", "龟裂", "坑洞", "块裂"],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
      axisLabel: { color: "#9ca3af", fontSize: 10 },
    },
    series: [
      {
        type: "bar",
        data: topDamage.length > 0 ? topDamage.map((d) => d.count) : [120, 85, 65, 45, 30],
        barWidth: 24,
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#60a5fa" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  const monthlyOption = {
    tooltip: { trigger: "axis" },
    legend: {
      data: ["图片检测", "视频检测"],
      bottom: 0,
      textStyle: { color: "#6b7280", fontSize: 11 },
    },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "5%", containLabel: true },
    xAxis: {
      type: "category",
      data: monthly.length > 0 ? monthly.map((d) => d.month) : ["1月", "2月", "3月", "4月", "5月", "6月"],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
      axisLabel: { color: "#9ca3af", fontSize: 10 },
    },
    series: [
      {
        name: "图片检测",
        type: "bar",
        data: monthly.length > 0 ? monthly.map((d) => d.images) : [45, 52, 61, 58, 72, 85],
        barWidth: 16,
        itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] },
      },
      {
        name: "视频检测",
        type: "bar",
        data: monthly.length > 0 ? monthly.map((d) => d.videos) : [12, 18, 15, 22, 28, 35],
        barWidth: 16,
        itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  const confidenceOption = {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "5%", containLabel: true },
    xAxis: {
      type: "category",
      data: confidence.length > 0 ? confidence.map((d) => d.week) : ["第1周", "第2周", "第3周", "第4周"],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
      axisLabel: { color: "#9ca3af", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
    },
    series: [
      {
        type: "line",
        data: confidence.length > 0 ? confidence.map((d) => d.avg_confidence) : [0.72, 0.75, 0.78, 0.76],
        smooth: true,
        lineStyle: { color: "#8b5cf6", width: 3 },
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: "#8b5cf6", borderColor: "#fff", borderWidth: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(139, 92, 246, 0.3)" },
              { offset: 1, color: "rgba(139, 92, 246, 0)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <>
      <Header title="数据统计分析" subtitle="道路病害检测数据可视化平台" />
      <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
              {["近7天", "近30天", "近90天", "全部"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    dateRange === range
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer"
              >
                <option value="全部">全部类型</option>
                <option value="裂缝">裂缝类</option>
                <option value="破损">破损类</option>
                <option value="变形">变形类</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新数据
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-3.5 h-3.5" />
              导出报表
            </button>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatisticCard
            title="总检测记录"
            value={overview?.total_records ?? 0}
            icon={Activity}
            color="bg-blue-600"
            trend="较上月 +12.5%"
          />
          <StatisticCard
            title="病害目标数"
            value={overview?.total_detections ?? 0}
            icon={AlertTriangle}
            color="bg-emerald-600"
            trend="较上月 +8.2%"
          />
          <StatisticCard
            title="平均置信度"
            value={((overview?.avg_confidence ?? 0) * 100).toFixed(1)}
            unit="%"
            icon={CheckCircle2}
            color="bg-violet-600"
          />
          <StatisticCard
            title="图片/视频比"
            value={`${overview?.total_images ?? 0}:${overview?.total_videos ?? 0}`}
            icon={BarChart3}
            color="bg-orange-600"
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 病害类型分布 */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-blue-600" />
                病害类型分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ReactECharts option={pieOption} style={{ height: "100%" }} />
              </div>
            </CardContent>
          </Card>

          {/* 高发病害类型 */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Top 5 高发病害类型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ReactECharts option={barOption} style={{ height: "100%" }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 月度检测趋势 */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                月度检测趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ReactECharts option={monthlyOption} style={{ height: "100%" }} />
              </div>
            </CardContent>
          </Card>

          {/* 置信度变化趋势 */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                置信度变化趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ReactECharts option={confidenceOption} style={{ height: "100%" }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 严重程度分布 - 单独一行 */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { label: "轻度病害", count: 156, color: "emerald", icon: Clock },
            { label: "中度病害", count: 89, color: "amber", icon: AlertTriangle },
            { label: "重度病害", count: 34, color: "rose", icon: AlertTriangle },
          ].map((item) => (
            <Card key={item.label} className="bg-white border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{item.count}</p>
                    <p className="text-xs text-gray-400 mt-1">占比 {((item.count / 279) * 100).toFixed(1)}%</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${item.color}-50`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                </div>
                <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-${item.color}-500 rounded-full`}
                    style={{ width: `${(item.count / 279) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
