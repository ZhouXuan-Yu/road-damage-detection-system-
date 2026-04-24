"use client";

import ReactECharts from "echarts-for-react";

interface ConfidenceTrendChartProps {
  data: Array<{
    week: string;
    avg_confidence: number;
    count: number;
  }>;
}

export function ConfidenceTrendChart({ data }: ConfidenceTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>平均置信度: ${(p.value * 100).toFixed(1)}%`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.week),
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
        rotate: 45,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      axisLabel: {
        color: "#6b7280",
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => d.avg_confidence),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          color: "#8b5cf6",
          width: 2,
        },
        itemStyle: {
          color: "#8b5cf6",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(139, 92, 246, 0.2)" },
              { offset: 1, color: "rgba(139, 92, 246, 0)" },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
