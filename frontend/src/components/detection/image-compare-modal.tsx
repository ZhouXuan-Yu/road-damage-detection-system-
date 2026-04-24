"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalSrc?: string;
  resultSrc?: string;
  filename?: string;
}

export function ImageCompareModal({
  open,
  onOpenChange,
  originalSrc,
  resultSrc,
  filename,
}: ImageCompareModalProps) {
  const [view, setView] = useState<"split" | "original" | "result">("split");
  const [zoom, setZoom] = useState(1);
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setView("split");
    setActiveSide("left");
  }, []);

  const renderImage = (src: string | undefined, label: string, side: "left" | "right") => {
    if (!src) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-400 text-sm">暂无图片</p>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden rounded-lg border transition-all",
          activeSide === side && view === "split"
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-gray-200"
        )}
        onClick={() => setActiveSide(side)}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          {view === "split" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveSide(side);
              }}
              className={cn(
                "text-xs px-2 py-0.5 rounded transition-colors",
                activeSide === side
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              选中
            </button>
          )}
        </div>
        <div
          className="flex-1 overflow-auto bg-gray-50 cursor-zoom-in"
          onClick={() => setActiveSide(side)}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.2s ease",
            }}
          >
            <Image
              src={src}
              alt={label}
              width={1200}
              height={800}
              className="max-w-none object-contain"
              unoptimized={true}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === "original") {
      return (
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">原始图像</span>
            <button
              onClick={() => setView("split")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              返回对比视图
            </button>
          </div>
          <div
            className="flex-1 overflow-auto flex items-start justify-center p-4 bg-gray-100 cursor-zoom-in"
            onClick={handleZoomIn}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease",
              }}
            >
              <Image
                src={originalSrc!}
                alt="Original"
                width={1200}
                height={800}
                className="max-w-none object-contain"
                unoptimized={true}
              />
            </div>
          </div>
        </div>
      );
    }

    if (view === "result") {
      return (
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100">
            <span className="text-sm font-medium text-blue-700">标注结果</span>
            <button
              onClick={() => setView("split")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              返回对比视图
            </button>
          </div>
          <div
            className="flex-1 overflow-auto flex items-start justify-center p-4 bg-gray-100 cursor-zoom-in"
            onClick={handleZoomIn}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease",
              }}
            >
              <Image
                src={resultSrc!}
                alt="Result"
                width={1200}
                height={800}
                className="max-w-none object-contain"
                unoptimized={true}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex gap-3 p-4 overflow-hidden">
        {renderImage(originalSrc, "原始图像", "left")}
        <div className="flex items-center">
          <button
            onClick={() => setActiveSide("left")}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="选中左侧"
          >
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        {renderImage(resultSrc, "标注结果", "right")}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col !max-w-[95vw] !max-h-[95vh] w-[95vw] h-[95vh] p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-row items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0 gap-4">
          <DialogTitle className="text-sm font-semibold text-gray-800 truncate">
            {filename ? `对比查看 — ${filename}` : "图像对比查看"}
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={view === "original" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("original")}
              className="h-7 text-xs gap-1"
              disabled={!originalSrc}
            >
              原始图
            </Button>
            <Button
              variant={view === "split" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("split")}
              className="h-7 text-xs gap-1"
            >
              对比
            </Button>
            <Button
              variant={view === "result" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("result")}
              className="h-7 text-xs gap-1"
              disabled={!resultSrc}
            >
              标注图
            </Button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-gray-500 w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1" title="重置">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden bg-gray-50">
          {renderContent()}
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 shrink-0">
          <span>点击图像区域选中对比侧 · 支持滚轮缩放 · ESC 关闭</span>
          <span>
            {view === "split" && originalSrc && resultSrc
              ? "对比视图：左右拖动查看差异"
              : "单击可放大图像"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
