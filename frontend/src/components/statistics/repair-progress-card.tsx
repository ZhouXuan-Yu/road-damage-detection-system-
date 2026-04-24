"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface RepairProgressCardProps {
  total: number;
  repairedCount: number;
  pendingCount: number;
  data: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
}

export function RepairProgressCard({ total, repairedCount, pendingCount, data }: RepairProgressCardProps) {
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>修复进度追踪</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  const repairedPercentage = total > 0 ? (repairedCount / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>修复进度追踪</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总体进度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">整体进度</span>
            <span className="font-semibold text-gray-900">{repairedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={repairedPercentage} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>已修复: {repairedCount}</span>
            <span>待修复: {pendingCount}</span>
          </div>
        </div>

        {/* 分类统计 */}
        <div className="space-y-3">
          {data.map((item, idx) => (
            <div key={`${item.severity}-${idx}`} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">{item.severity}</span>
                <span className="text-gray-500">{item.count} 个</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
