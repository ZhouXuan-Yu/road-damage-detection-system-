"use client";

import ReactECharts from "echarts-for-react";

interface TopDamageTypesChartProps {
  data: Array<{
    class_name: string;
    count: number;
    percentage: number;
  }>;
}

export function TopDamageTypesChart({ data }: TopDamageTypesChartProps) {
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
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>检测次数: ${item.value} 次<br/>占比: ${item.data.percentage}%`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: data.map((d) => d.class_name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#374151",
        fontSize: 12,
      },
    },
    series: [
      {
        type: "bar",
        data: data
          .map((d) => ({
            value: d.count,
            percentage: d.percentage,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#3b82f6" },
                  { offset: 1, color: "#60a5fa" },
                ],
              },
              borderRadius: [0, 4, 4, 0],
            },
          }))
          .reverse(),
        barWidth: 20,
        label: {
          show: true,
          position: "right",
          formatter: "{c} 次",
          color: "#6b7280",
          fontSize: 11,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: data.length * 50 + 40 }} />;
}
