"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { Search, Image as ImageIcon, Film, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface HistoryItem {
  id: number;
  filename: string;
  file_type: string;
  total_count: number;
  avg_confidence: number;
  thumbnail_path?: string;
  result_path?: string;
  created_at: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setLoading(true);
    api.history
      .list({ page, limit, search: search || undefined })
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <>
      <Header title="检测历史" subtitle="查看所有历史检测记录" />
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <div className="flex items-center gap-4 p-4 border-b border-gray-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索文件名..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{total} 条记录</Badge>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <Loading message="加载历史记录..." />
            ) : items.length === 0 ? (
              <EmptyState
                title="暂无检测记录"
                description="上传图片或视频进行检测后，记录将显示在这里"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative h-14 w-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {item.thumbnail_path ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${item.thumbnail_path}`}
                          alt={item.filename}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          {item.file_type === "video" ? (
                            <Film className="h-6 w-6 text-gray-400" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.filename}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>

                    <Badge variant={item.file_type === "video" ? "secondary" : "default"}>
                      {item.file_type === "video" ? "视频" : "图片"}
                    </Badge>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{item.total_count}</p>
                      <p className="text-xs text-gray-400">病害数</p>
                    </div>

                    <div className="text-right shrink-0 w-16">
                      <p className="text-sm font-semibold text-green-600">
                        {(item.avg_confidence * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-400">置信度</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  第 {page} 页，共 {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
