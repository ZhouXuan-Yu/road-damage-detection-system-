"use client";

import ReactECharts from "echarts-for-react";

interface MonthlyTrendChartProps {
  data: Array<{
    month: string;
    images: number;
    videos: number;
    total: number;
  }>;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
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
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["图片", "视频"],
      bottom: 0,
      itemWidth: 16,
      itemHeight: 8,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.month),
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisTick: { show: false },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#6b7280" },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
    },
    series: [
      {
        name: "图片",
        type: "bar",
        stack: "total",
        data: data.map((d) => d.images),
        itemStyle: { color: "#3b82f6", borderRadius: [0, 0, 0, 0] },
        barWidth: 20,
      },
      {
        name: "视频",
        type: "bar",
        stack: "total",
        data: data.map((d) => d.videos),
        itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
        barWidth: 20,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}
