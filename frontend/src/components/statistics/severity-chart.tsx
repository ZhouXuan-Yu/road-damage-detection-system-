"use client";

import ReactECharts from "echarts-for-react";

interface SeverityChartProps {
  data: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "#10b981",
  高: "#10b981",
  高轻度: "#10b981",
  medium: "#f59e0b",
  中: "#f59e0b",
  中度: "#f59e0b",
  high: "#ef4444",
  高: "#ef4444",
  严重: "#ef4444",
};

function getSeverityColor(severity: string): string {
  const lower = severity.toLowerCase();
  if (lower.includes("low") || lower.includes("轻") || lower === "l") {
    return SEVERITY_COLORS.low;
  }
  if (lower.includes("high") || lower.includes("重") || lower === "h") {
    return SEVERITY_COLORS.high;
  }
  return SEVERITY_COLORS.medium;
}

export function SeverityChart({ data }: SeverityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.severity,
    value: d.count,
    itemStyle: { color: getSeverityColor(d.severity) },
  }));

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        return `${params.name}<br/>数量: ${params.value} 个<br/>占比: ${params.percent}%`;
      },
    },
    legend: {
      bottom: 0,
      left: "center",
      itemWidth: 12,
      itemHeight: 12,
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: "bold",
          },
        },
        data: chartData,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
