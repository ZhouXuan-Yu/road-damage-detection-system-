"use client";

import { useEffect, useRef, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { ECharts } from "echarts";
import type { GraphNodeResponse, GraphLinkResponse } from "@/lib/api-types";

const ENTITY_COLORS: Record<string, string> = {
  Disease: "#3b82f6",
  Cause: "#dc2626",
  Repair: "#16a34a",
  Material: "#d97706",
  Standard: "#7c3aed",
  Component: "#0891b2",
  Risk: "#db2777",
  Region: "#65a30d",
  Obstacle: "#ea580c",
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
  CAUSED_BY: "#dc2626",
  LEADS_TO: "#ea580c",
  TREATED_BY: "#16a34a",
  USES_MATERIAL: "#d97706",
  AFFECTS_COMPONENT: "#0891b2",
  RELATED_TO: "#94a3b8",
  OCCURS_IN: "#65a30d",
  CO_OCCURS: "#db2777",
  APPLIES_STANDARD: "#7c3aed",
  CLASSIFIED_BY: "#64748b",
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
  CLASSIFIED_BY: "按...分类",
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
      label: {
        show: true,
        formatter: ENTITY_LABELS[t] || t,
        fontSize: 11,
        color: ENTITY_COLORS[t],
        fontWeight: 600,
        fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
      },
      itemStyle: { color: ENTITY_COLORS[t] },
    }));

    const chartNodes = nodes.map((n) => {
      const color = ENTITY_COLORS[n.entity_type] || "#6b7280";
      const isSelected = selectedNodeId === n.id;
      const size = (n.symbolSize || 30) + (isSelected ? 12 : 0);

      return {
        id: String(n.id),
        name: n.name,
        symbolSize: size,
        category: n.entity_type,
        value: 0,
        draggable: true,
        label: {
          show: true,
          position: "bottom",
          formatter: `{a|${n.name.length > 8 ? n.name.slice(0, 8) + "..." : n.name}}`,
          rich: {
            a: {
              fontSize: 11,
              color: isSelected ? "#1e40af" : "#475569",
              fontWeight: isSelected ? 700 : 400,
              fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
            },
          },
        },
        itemStyle: {
          color: {
            type: "radial" as const,
            colorStops: isSelected
              ? [
                  { offset: 0, color: color },
                  { offset: 0.7, color: color },
                  { offset: 1, color: color + "40" },
                ]
              : [
                  { offset: 0, color: color },
                  { offset: 1, color: color + "cc" },
                ],
          },
          borderColor: isSelected ? "#1e40af" : "#ffffff",
          borderWidth: isSelected ? 3 : 1.5,
          shadowBlur: isSelected ? 20 : 4,
          shadowColor: isSelected ? color + "80" : color + "30",
        },
      };
    });

    const chartLinks = links.map((l) => {
      const relColor = RELATION_COLORS[l.relation_type] || "#94a3b8";
      const isRelated =
        selectedNodeId !== null &&
        (l.source === selectedNodeId || l.target === selectedNodeId);
      const opacity = selectedNodeId === null ? 0.5 : isRelated ? 0.85 : 0.1;

      return {
        source: String(l.source),
        target: String(l.target),
        name: l.relation_type,
        lineStyle: {
          color: relColor,
          width: (l.lineStyle?.width || 1.5) * (isRelated ? 1.8 : 1),
          type: "solid",
          curveness: 0.08,
          opacity,
        },
        label: {
          show: false,
          formatter: RELATION_LABELS[l.relation_type] || l.relation_type,
          fontSize: 10,
          color: relColor,
          backgroundColor: "rgba(255,255,255,0.85)",
          padding: [2, 4],
          borderRadius: 3,
        },
        emphasis: {
          lineStyle: { width: 2.5, opacity: 1 },
        },
      };
    });

    return {
      backgroundColor: {
        type: "linear" as const,
        x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: "#f8fafc" },
          { offset: 1, color: "#f1f5f9" },
        ],
      },
      animation: true,
      animationDuration: 1200,
      animationEasing: "cubicOut" as const,
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "#334155",
        borderWidth: 1,
        padding: [10, 16],
        textStyle: { fontSize: 12, color: "#e2e8f0" },
        extraCssText: "box-shadow: 0 4px 24px rgba(0,0,0,0.25); border-radius: 6px;",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (params.dataType === "node") {
            const n = params.data;
            const typeColor = ENTITY_COLORS[n.category] || "#6b7280";
            const desc = n.desc || "";
            return `
              <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif; min-width:160px">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px">
                  <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${typeColor}; box-shadow:0 0 6px ${typeColor}80"></span>
                  <span style="font-size:14px; font-weight:700; color:#f1f5f9">${n.name}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8; margin-bottom:${desc ? "6px" : "0"}">
                  ${ENTITY_LABELS[n.category] || n.category}
                </div>
                ${desc ? `<div style="font-size:11px; color:#cbd5e1; line-height:1.5; border-top:1px solid #334155; padding-top:6px; margin-top:4px">${desc.slice(0, 80)}${desc.length > 80 ? "..." : ""}</div>` : ""}
              </div>`;
          }
          if (params.dataType === "edge") {
            const l = params.data;
            const relColor = RELATION_COLORS[l.name] || "#94a3b8";
            return `
              <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif; padding:2px 0">
                <div style="display:flex; align-items:center; gap:8px">
                  <span style="font-size:12px; color:#94a3b8">${l.source}</span>
                  <span style="font-size:11px; color:${relColor}; font-weight:600">→</span>
                  <span style="font-size:12px; color:#94a3b8">${l.target}</span>
                </div>
                <div style="font-size:11px; color:${relColor}; margin-top:4px; font-weight:500">${RELATION_LABELS[l.name] || l.name}</div>
              </div>`;
          }
          return "";
        },
      },
      legend: {
        type: "scroll",
        bottom: 8,
        left: "center",
        itemGap: 20,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 11, color: "#64748b" },
        data: Object.keys(ENTITY_COLORS).filter((t) =>
          nodes.some((n) => n.entity_type === t)
        ),
        pageTextStyle: { color: "#64748b" },
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
          edgeSymbolSize: [5, 12],
          center: ["50%", "50%"],
          force: {
            repulsion: 500,
            gravity: 0.08,
            edgeLength: [120, 350],
            layoutAnimation: true,
            friction: 0.15,
            alpha: 0.3,
            alphaDecay: 0.02,
          },
          lineStyle: { curveness: 0.08 },
          emphasis: {
            focus: "adjacency" as const,
            lineStyle: { width: 2.5, color: "#3b82f6", opacity: 1 },
            itemStyle: {
              borderWidth: 3,
              shadowBlur: 24,
            },
          },
          data: chartNodes,
          links: chartLinks,
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
        if (node) onNodeClick(node);
      }
    },
  };

  return (
    <div className="relative w-full h-full">
      <ReactECharts
        ref={chartRef}
        option={getOption()}
        style={{ width: `${width}px`, height: `${height}px` }}
        onEvents={onEvents}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}
