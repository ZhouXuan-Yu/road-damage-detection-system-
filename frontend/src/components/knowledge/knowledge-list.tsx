"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { DAMAGE_COLORS } from "@/lib/utils";

interface KnowledgeItem {
  id: number;
  code: string;
  name: string;
  type: string;
  description?: string;
  causes?: Array<{ name: string }>;
  repair_methods?: Array<{ method: string }>;
  related_codes?: string[];
  priority: number;
  created_at: string;
}

interface KnowledgeListProps {
  onEdit: (item: KnowledgeItem) => void;
  onDeleted: () => void;
}

export function KnowledgeList({ onEdit, onDeleted }: KnowledgeListProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.kg.list({ page, limit, search: search || undefined });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch knowledge:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const handleDelete = async (code: string) => {
    if (!confirm(`确定要删除病害 "${code}" 吗？`)) return;

    setDeleting(code);
    try {
      await api.kg.delete(code);
      onDeleted();
      fetchData();
    } catch (err) {
      alert("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* 搜索 */}
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="搜索病害编码或名称..."
          className="max-w-xs"
        />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">暂无数据</div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="py-4 first:pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: DAMAGE_COLORS[item.code] || "#6b7280" }}
                    >
                      {item.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          优先级 {item.priority}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {item.causes && item.causes.length > 0 && (
                          <div className="flex gap-1">
                            {item.causes.slice(0, 3).map((cause, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {cause.name}
                              </Badge>
                            ))}
                            {item.causes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.causes.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item.code)}
                      disabled={deleting === item.code}
                    >
                      {deleting === item.code ? "删除中..." : "删除"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                共 {total} 条，第 {page}/{totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
