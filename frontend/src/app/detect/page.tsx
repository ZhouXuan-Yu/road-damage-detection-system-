"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadArea } from "@/components/detection/upload-area";
import { ImagePreview } from "@/components/detection/image-preview";
import { ResultStats } from "@/components/detection/result-stats";
import { DetectionPanel } from "@/components/detection/detection-panel";
import { Loading } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { useDetectionStore } from "@/stores/use-detection-store";
import { Upload, Film, AlertCircle } from "lucide-react";
import { DetectionResult } from "@/types/detection";

export default function DetectPage() {
  const {
    file,
    fileType,
    confidence,
    iou,
    isProcessing,
    progress,
    result,
    error,
    setFile,
    setFileType,
    setConfidence,
    setIou,
    setProcessing,
    setProgress,
    setResult,
    setError,
    reset,
  } = useDetectionStore();

  const [localResult, setLocalResult] = useState<DetectionResult | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [originalVideoSrc, setOriginalVideoSrc] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      setLocalResult(null);
      setVideoSrc(null);
      setOriginalImageSrc(null);
      setOriginalVideoSrc(null);

      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      const isVideo = ["mp4", "avi", "mov", "mkv"].includes(ext || "");
      setFileType(isVideo ? "video" : "image");

      // 根据文件扩展名直接判断类型来生成预览
      if (isVideo) {
        setOriginalVideoSrc(URL.createObjectURL(selectedFile));
      } else {
        setOriginalImageSrc(URL.createObjectURL(selectedFile));
      }
    },
    [setFile, setError, setFileType]
  );

  const handleDetect = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setProgress(0);
    setLocalResult(null);
    setVideoSrc(null);

    try {
      if (fileType === "image") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("confidence", String(confidence));
        formData.append("iou", String(iou));

        setProgress(50);
        const data = await api.detect.image(formData);
        setProgress(100);
        setLocalResult(data);
        setResult(data);
        // Create preview URL for original image
        const originalUrl = URL.createObjectURL(file);
        setOriginalImageSrc(originalUrl);
        setProcessing(false);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("confidence", String(confidence));
        formData.append("iou", String(iou));

        const task = await api.detect.video(formData);
        const taskId = task.task_id;

        // 立即更新进度，让用户知道已开始处理
        setProgress(10);

        const eventSource = new EventSource(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/detect/stream/${taskId}`
        );

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.status === "processing") {
            const newProgress = data.progress || 0;
            setProgress(Math.min(newProgress + 10, 95)); // 保留最后5%给完成处理
          } else if (data.status === "completed") {
            setProgress(100);
            const videoUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${data.result_path}`;

            const counterData = data.counter || {};
            const localResultData = {
              record_id: 0,
              filename: file.name,
              file_type: "video",
              result_path: data.result_path,
              total_count: Object.values(counterData).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0),
              avg_confidence: data.avg_conf || 0,
              frame_count: data.frame_count,
              detection_data: counterData,
              damages: (data.damages || []) as DetectionResult["damages"],
              created_at: new Date().toISOString(),
            };

            setLocalResult(localResultData);
            setVideoSrc(videoUrl);
            setResult(data);
            setProcessing(false);
            eventSource.close();
          } else if (data.status === "failed") {
            setError(data.error || "Video processing failed");
            setProcessing(false);
            eventSource.close();
          }
        };

        eventSource.onerror = () => {
          setError("Connection lost");
          setProcessing(false);
          eventSource.close();
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "检测失败");
      setProcessing(false);
    }
  };

  const displayResult = localResult || (result as DetectionResult | null);

  // 判断视频检测结果是否有效（必须有 record_id 才是新结果）
  const hasValidVideoResult = localResult && videoSrc;
  // 判断图片检测结果是否有效
  const hasValidImageResult = displayResult && (displayResult as DetectionResult).record_id !== undefined;

  return (
    <>
      <Header title="病害检测" subtitle="上传道路图片或视频进行智能检测" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>选择文件</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={fileType} onValueChange={(v) => setFileType(v as "image" | "video")}>
                  <TabsList>
                    <TabsTrigger value="image" className="gap-2">
                      <Upload className="h-4 w-4" /> 图片检测
                    </TabsTrigger>
                    <TabsTrigger value="video" className="gap-2">
                      <Film className="h-4 w-4" /> 视频检测
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="image" className="mt-4">
                    <UploadArea
                      fileType="image"
                      onFileSelect={handleFileSelect}
                      currentFile={fileType === "image" ? file : null}
                    />
                    {displayResult && (
                      <ImagePreview
                        originalSrc={originalImageSrc || undefined}
                        resultSrc={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${displayResult.result_path}`}
                        filename={file?.name || displayResult.filename}
                        className="mt-4"
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="video" className="mt-4">
                    <UploadArea
                      fileType="video"
                      onFileSelect={handleFileSelect}
                      currentFile={file}
                    />
                    {/* 上传后立即显示原始视频预览 */}
                    {file && fileType === "video" && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="relative">
                          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                            原始视频
                          </div>
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                            {originalVideoSrc ? (
                              <video
                                src={originalVideoSrc}
                                controls
                                className="w-full aspect-video"
                              />
                            ) : (
                              <div className="flex items-center justify-center aspect-video text-gray-400 text-sm">
                                加载中...
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 标注结果视频（处理完成后显示） */}
                        <div className="relative">
                          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium">
                            标注结果
                          </div>
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                            {hasValidVideoResult ? (
                              <video
                                key={videoSrc}
                                src={videoSrc}
                                controls
                                className="w-full aspect-video"
                              />
                            ) : (
                              <div className="flex items-center justify-center aspect-video text-gray-400 text-sm">
                                等待处理结果
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {isProcessing && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">处理进度</span>
                      <span className="font-medium text-blue-600">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={handleDetect}
                    disabled={!file || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? "处理中..." : "开始检测"}
                  </Button>
                  <Button variant="outline" onClick={reset} disabled={isProcessing}>
                    重置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>检测参数</CardTitle>
              </CardHeader>
              <CardContent>
                <DetectionPanel
                  confidence={confidence}
                  iou={iou}
                  onConfidenceChange={setConfidence}
                  onIouChange={setIou}
                />
              </CardContent>
            </Card>

            {displayResult && (
              <Card>
                <CardHeader>
                  <CardTitle>检测结果统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultStats
                    detectionData={displayResult.detection_data}
                    totalCount={displayResult.total_count}
                    avgConfidence={displayResult.avg_confidence}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
