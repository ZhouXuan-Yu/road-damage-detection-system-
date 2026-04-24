"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      加载图谱中...
    </div>
  ),
});

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNodeId: string | null;
  onNodeClick: (node: GraphNode) => void;
  width?: number;
  height?: number;
}

const NODE_COLORS: Record<string, string> = {
  Disease: "#3b82f6",
  Obstacle: "#f59e0b",
  Repair: "#10b981",
  Cause: "#8b5cf6",
};

export function KnowledgeGraph({
  nodes,
  links,
  selectedNodeId,
  onNodeClick,
  width = 800,
  height = 600,
}: KnowledgeGraphProps) {
  const graphRef = useRef<any>(null);

  const getNodeColor = useCallback((type: string): string => {
    return NODE_COLORS[type] || "#6b7280";
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      const n = node as GraphNode;
      onNodeClick(n);

      // 聚焦到节点
      if (graphRef.current) {
        graphRef.current.centerAt(0, 0, 500);
        graphRef.current.zoom(2, 500);
      }
    },
    [onNodeClick]
  );

  // 初始居中
  useEffect(() => {
    if (graphRef.current && nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [nodes.length]);

  return (
    <ForceGraph2D
      ref={graphRef}
      graphData={{ nodes, links }}
      width={width}
      height={height}
      nodeLabel="name"
      nodeColor={(node) => {
        const n = node as GraphNode;
        if (selectedNodeId && n.id === selectedNodeId) {
          return "#2563eb"; // 选中高亮
        }
        return getNodeColor(n.type);
      }}
      nodeVal={(node) => {
        const n = node as GraphNode;
        return n.id === selectedNodeId ? 50 : 30;
      }}
      linkColor={() => "#cbd5e1"}
      linkWidth={(link) => {
        const l = link as GraphLink;
        // 如果是选中的节点相关的连线，加粗
        if (
          selectedNodeId &&
          (l.source === selectedNodeId || l.target === selectedNodeId)
        ) {
          return 3;
        }
        return 1.5;
      }}
      linkDirectionalArrowLength={8}
      linkDirectionalArrowRelPos={1}
      onNodeClick={handleNodeClick}
      enableZoomInteraction={true}
      enablePanInteraction={true}
      backgroundColor="#f8fafc"
      cooldownTicks={100}
      onEngineStop={() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }}
    />
  );
}
