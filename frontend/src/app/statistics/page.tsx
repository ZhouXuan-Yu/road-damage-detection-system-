"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/loading";
import { api } from "@/lib/api";
import ReactECharts from "echarts-for-react";
import { TopDamageTypesChart } from "@/components/statistics/top-damage-types-chart";
import { SeverityChart } from "@/components/statistics/severity-chart";
import { ConfidenceTrendChart } from "@/components/statistics/confidence-trend-chart";
import { MonthlyTrendChart } from "@/components/statistics/monthly-trend-chart";
import { RepairProgressCard } from "@/components/statistics/repair-progress-card";

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

interface RepairData {
  items: SeverityItem[];
  total: number;
  repaired_count: number;
  pending_count: number;
}

export default function StatisticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [severity, setSeverity] = useState<SeverityItem[]>([]);
  const [topDamage, setTopDamage] = useState<TopDamageItem[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceItem[]>([]);
  const [monthly, setMonthly] = useState<MonthlyItem[]>([]);
  const [repair, setRepair] = useState<RepairData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats.overview(),
      api.stats.distribution(),
      api.stats.severity().catch(() => ({ items: [], total: 0 })),
      api.stats.topDamageTypes(5).catch(() => ({ items: [], total: 0 })),
      api.stats.confidenceTrend(12).catch(() => ({ items: [] })),
      api.stats.monthlyTrend(6).catch(() => ({ items: [] })),
      api.stats.repairProgress().catch(() => ({ items: [], total: 0, repaired_count: 0, pending_count: 0 })),
    ])
      .then(([ov, dist, sev, top, conf, month, rep]) => {
        setOverview(ov);
        setDistribution(dist.items || []);
        setSeverity(sev.items || []);
        setTopDamage(top.items || []);
        setConfidence(conf.items || []);
        setMonthly(month.items || []);
        setRepair(rep);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading message="加载统计数据..." />;

  // 饼图配置
  const pieOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, left: "center" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
        },
        data: distribution.map((d) => ({
          name: d.name,
          value: d.value,
        })),
      },
    ],
  };

  return (
    <>
      <Header title="数据统计" subtitle="检测数据可视化分析" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "总记录数", value: overview?.total_records ?? 0, color: "blue" },
            { label: "总检测数", value: overview?.total_detections ?? 0, color: "green" },
            { label: "平均置信度", value: `${((overview?.avg_confidence ?? 0) * 100).toFixed(1)}%`, color: "purple" },
            { label: "图片/视频比", value: `${overview?.total_images ?? 0}/${overview?.total_videos ?? 0}`, color: "orange" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6 text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 第一行图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 病害类型分布 */}
          <Card>
            <CardHeader>
              <CardTitle>病害类型分布</CardTitle>
            </CardHeader>
            <CardContent>
              {distribution.length > 0 ? (
                <ReactECharts option={pieOption} style={{ height: 280 }} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 高发病害类型 */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 高发病害类型</CardTitle>
            </CardHeader>
            <CardContent>
              <TopDamageTypesChart data={topDamage} />
            </CardContent>
          </Card>
        </div>

        {/* 第二行图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 严重程度分布 */}
          <Card>
            <CardHeader>
              <CardTitle>病害严重程度分布</CardTitle>
            </CardHeader>
            <CardContent>
              <SeverityChart data={severity} />
            </CardContent>
          </Card>

          {/* 月度检测趋势 */}
          <Card>
            <CardHeader>
              <CardTitle>月度检测趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyTrendChart data={monthly} />
            </CardContent>
          </Card>
        </div>

        {/* 第三行图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 置信度变化趋势 */}
          <Card>
            <CardHeader>
              <CardTitle>置信度变化趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfidenceTrendChart data={confidence} />
            </CardContent>
          </Card>

          {/* 修复进度追踪 */}
          <RepairProgressCard
            total={repair?.total ?? 0}
            repairedCount={repair?.repaired_count ?? 0}
            pendingCount={repair?.pending_count ?? 0}
            data={repair?.items ?? []}
          />
        </div>
      </div>
    </>
  );
}
