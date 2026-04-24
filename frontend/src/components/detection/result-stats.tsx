"use client";

import { cn, DAMAGE_NAMES, DAMAGE_COLORS } from "@/lib/utils";

interface ResultStatsProps {
  detectionData: Record<string, number>;
  totalCount: number;
  avgConfidence: number;
  className?: string;
}

export function ResultStats({
  detectionData,
  totalCount,
  avgConfidence,
  className,
}: ResultStatsProps) {
  const entries = Object.entries(detectionData || {});

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{totalCount}</p>
          <p className="text-xs text-blue-600 mt-1">检测目标总数</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {(avgConfidence * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-green-600 mt-1">平均置信度</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{entries.length}</p>
          <p className="text-xs text-purple-600 mt-1">病害类型数</p>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">病害分布</p>
          <div className="space-y-2">
            {entries.map(([key, count]) => {
              const color = DAMAGE_COLORS[key] || "#6b7280";
              const name = DAMAGE_NAMES[key] || key;
              const percentage = ((count / totalCount) * 100).toFixed(1);
              return (
                <div key={key} className="flex items-center gap-3">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-600 w-24">{name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {count}
                  </span>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          暂无检测数据
        </div>
      )}
    </div>
  );
}
