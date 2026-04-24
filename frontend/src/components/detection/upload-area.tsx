"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  fileType: "image" | "video";
  currentFile?: File | null;
}

export function UploadArea({ onFileSelect, fileType, currentFile }: UploadAreaProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileType === "image"
      ? { "image/*": [".jpg", ".jpeg", ".png", ".bmp", ".webp"] }
      : { "video/*": [".mp4", ".avi", ".mov", ".mkv"] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-64",
        isDragActive
          ? "border-blue-500 bg-blue-50"
          : currentFile
          ? "border-green-300 bg-green-50"
          : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
      )}
    >
      <input {...getInputProps()} />

      {currentFile ? (
        <>
          {fileType === "image" ? (
            <ImageIcon className="h-12 w-12 text-green-600 mb-3" />
          ) : (
            <Film className="h-12 w-12 text-green-600 mb-3" />
          )}
          <p className="text-sm font-medium text-green-700">{currentFile.name}</p>
          <p className="text-xs text-green-600 mt-1">
            {(currentFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <p className="text-xs text-gray-400 mt-2">点击或拖拽以重新选择</p>
        </>
      ) : (
        <>
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full mb-4 transition-colors",
              isDragActive ? "bg-blue-100" : "bg-gray-200"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6",
                isDragActive ? "text-blue-600" : "text-gray-500"
              )}
            />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {isDragActive ? "释放以上传" : "拖拽文件到此处"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            或点击选择{fileType === "image" ? "图片" : "视频"}文件
          </p>
          <p className="text-xs text-gray-400 mt-1">
            支持 {fileType === "image" ? "JPG, PNG, BMP, WebP" : "MP4, AVI, MOV, MKV"}
          </p>
        </>
      )}
    </div>
  );
}
