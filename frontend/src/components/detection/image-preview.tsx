"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageCompareModal } from "./image-compare-modal";
import { ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  originalSrc?: string;
  resultSrc?: string;
  filename?: string;
  className?: string;
}

export function ImagePreview({ originalSrc, resultSrc, filename, className }: ImagePreviewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasAnyImage = originalSrc || resultSrc;

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-4", className)}>
        {/* 原始图像 */}
        <div
          className="relative group cursor-pointer"
          onClick={() => originalSrc && setModalOpen(true)}
        >
          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
            原始图像
          </div>
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video">
            {originalSrc ? (
              <>
                <Image
                  src={originalSrc}
                  alt="Original"
                  fill
                  className="object-contain transition-transform group-hover:scale-[1.02]"
                  unoptimized={true}
                />
                {/* 悬浮放大图标 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2.5">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                等待上传图像
              </div>
            )}
          </div>
        </div>

        {/* 标注结果 */}
        <div
          className="relative group cursor-pointer"
          onClick={() => resultSrc && setModalOpen(true)}
        >
          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium">
            标注结果
          </div>
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video">
            {resultSrc ? (
              <>
                <Image
                  src={resultSrc}
                  alt="Result"
                  fill
                  className="object-contain transition-transform group-hover:scale-[1.02]"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2.5">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                等待检测结果
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 无图片时提示可点击 */}
      {hasAnyImage && (
        <p className="text-xs text-gray-400 text-center mt-2">
          点击图像可放大查看详细对比
        </p>
      )}

      <ImageCompareModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        originalSrc={originalSrc}
        resultSrc={resultSrc}
        filename={filename}
      />
    </>
  );
}
