"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { ECharts } from "echarts";
import type { GraphNodeResponse, GraphLinkResponse } from "@/lib/api-types";

const ENTITY_COLORS: Record<string, string> = {
  Disease: "#3b82f6",
  Cause: "#ef4444",
  Repair: "#10b981",
  Material: "#f59e0b",
  Standard: "#8b5cf6",
  Component: "#06b6d4",
  Risk: "#ec4899",
  Region: "#84cc16",
  Obstacle: "#f97316",
};

const ENTITY_LABELS: Record<string, string> = {
  Disease: "病害",
  Cause: "成因",
  Repair: "维修方法",
  Material: "材料",
  Standard: "技术标准",
  Component: "道路构件",
  Risk: "风险等级",
  Region: "区域/路段",
  Obstacle: "障碍物",
};

const RELATION_COLORS: Record<string, string> = {
  CAUSED_BY: "#ef4444",
  LEADS_TO: "#f97316",
  TREATED_BY: "#10b981",
  USES_MATERIAL: "#f59e0b",
  AFFECTS_COMPONENT: "#06b6d4",
  RELATED_TO: "#94a3b8",
  OCCURS_IN: "#84cc16",
  CO_OCCURS: "#ec4899",
  APPLIES_STANDARD: "#8b5cf6",
};

const RELATION_LABELS: Record<string, string> = {
  CAUSED_BY: "由...引起",
  LEADS_TO: "会导致",
  TREATED_BY: "由...维修",
  USES_MATERIAL: "使用材料",
  AFFECTS_COMPONENT: "影响构件",
  RELATED_TO: "相关",
  OCCURS_IN: "发生于",
  CO_OCCURS: "伴随发生",
  APPLIES_STANDARD: "依据标准",
};

interface GraphChartProps {
  nodes: GraphNodeResponse[];
  links: GraphLinkResponse[];
  onNodeClick: (node: GraphNodeResponse) => void;
  selectedNodeId?: number | null;
  width?: number;
  height?: number;
}

export function GraphChart({
  nodes,
  links,
  onNodeClick,
  selectedNodeId,
  width = 800,
  height = 600,
}: GraphChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  const getOption = useCallback(() => {
    const categories = Object.keys(ENTITY_COLORS).map((t) => ({
      name: t,
      label: { show: true, formatter: ENTITY_LABELS[t] || t, fontSize: 11 },
    }));

    const chartNodes = nodes.map((n) => ({
      id: String(n.id),
      name: n.name,
      symbolSize: n.symbolSize || 30,
      category: n.entity_type,
      value: 0,
      draggable: true,
      label: {
        show: true,
        position: "bottom",
        formatter: n.name,
        fontSize: 11,
        color: "#374151",
      },
      itemStyle: {
        color: n.color || ENTITY_COLORS[n.entity_type] || "#6b7280",
        borderColor: selectedNodeId === n.id ? "#1e40af" : undefined,
        borderWidth: selectedNodeId === n.id ? 3 : 1,
        shadowBlur: selectedNodeId === n.id ? 10 : 0,
        shadowColor: selectedNodeId === n.id ? "rgba(30,64,175,0.3)" : undefined,
      },
    }));

    const chartLinks = links.map((l) => ({
      source: String(l.source),
      target: String(l.target),
      name: l.relation_type,
      lineStyle: {
        color: l.lineStyle?.color || RELATION_COLORS[l.relation_type] || "#94a3b8",
        width: l.lineStyle?.width || 1.5,
        type: "solid" as const,
        curveness: 0.1,
        opacity: 0.7,
      },
      label: {
        show: false,
        formatter: RELATION_LABELS[l.relation_type] || l.relation_type,
        fontSize: 10,
        color: "#6b7280",
      },
    }));

    return {
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut" as const,
      backgroundColor: "#f8fafc",
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#1f2937", fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (params.dataType === "node") {
            const n = params.data;
            return `<div style="font-weight:600;margin-bottom:4px">${n.name}</div>
                    <div style="color:#6b7280;font-size:11px">类型: ${ENTITY_LABELS[n.category] || n.category}</div>`;
          }
          if (params.dataType === "edge") {
            const l = params.data;
            return `<div style="color:#6b7280;font-size:11px">
              <b style="color:#374151">${l.source}</b> → <b style="color:#374151">${l.target}</b><br/>
              关系: <b style="color:#1f2937">${RELATION_LABELS[l.name] || l.name}</b>
            </div>`;
          }
          return "";
        },
      },
      legend: {
        bottom: 10,
        data: Object.keys(ENTITY_COLORS).filter((t) =>
          nodes.some((n) => n.entity_type === t)
        ),
        textStyle: { fontSize: 11, color: "#6b7280" },
        itemGap: 16,
        itemWidth: 14,
        itemHeight: 14,
      },
      series: [
        {
          type: "graph" as const,
          layout: "force" as const,
          roam: true,
          draggable: true,
          symbol: "circle",
          categories,
          focusNodeAdjacency: true,
          edgeSymbol: ["circle", "arrow"],
          edgeSymbolSize: [6, 10],
          force: {
            repulsion: 400,
            gravity: 0.15,
            edgeLength: [80, 200],
            layoutAnimation: true,
            friction: 0.2,
          },
          lineStyle: { curveness: 0.1 },
          emphasis: {
            focus: "adjacency" as const,
            lineStyle: { width: 3, color: "#1e40af", opacity: 1 },
            itemStyle: { borderWidth: 3, shadowBlur: 15 },
          },
          data: chartNodes,
          links: chartLinks,
          label: {
            show: true,
            position: "bottom" as const,
            formatter: "{b}",
            fontSize: 11,
            color: "#374151",
          },
        },
      ],
    };
  }, [nodes, links, selectedNodeId]);

  useEffect(() => {
    if (chartRef.current) {
      const instance: ECharts = chartRef.current.getEchartsInstance();
      instance.setOption(getOption(), true);
    }
  }, [getOption]);

  const onEvents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    click: (params: any) => {
      if (params.dataType === "node" && params.data?.id) {
        const node = nodes.find((n) => String(n.id) === String(params.data.id));
        if (node) {
          onNodeClick(node);
        }
      }
    },
  };

  return (
    <ReactECharts
      ref={chartRef}
      option={getOption()}
      style={{ width: `${width}px`, height: `${height}px` }}
      onEvents={onEvents}
      opts={{ renderer: "canvas" }}
    />
  );
}
