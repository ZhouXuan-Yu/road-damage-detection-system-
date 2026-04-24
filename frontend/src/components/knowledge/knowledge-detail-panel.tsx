"use client";

import { Badge } from "@/components/ui/badge";
import { DAMAGE_COLORS } from "@/lib/utils";

interface DiseaseDetail {
  id: string;
  name: string;
  type: string;
  description?: string;
  causes?: Array<{ name: string; description: string }>;
  severity_low?: string;
  severity_medium?: string;
  severity_high?: string;
  repair_methods?: Array<{ method: string; description: string; cost: string; time: string }>;
  related_codes?: string[];
}

interface KnowledgeDetailPanelProps {
  nodeId: string | null;
  nodeName: string | null;
  detail: DiseaseDetail | null;
  loading: boolean;
}

export function KnowledgeDetailPanel({
  nodeId,
  nodeName,
  detail,
  loading,
}: KnowledgeDetailPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        加载详情中...
      </div>
    );
  }

  if (!nodeId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm space-y-2">
        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p>点击图谱中的节点查看详情</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-auto max-h-full">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: DAMAGE_COLORS[nodeId] || "#6b7280" }}
        >
          {nodeId}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{nodeName || nodeId}</h3>
          <Badge variant="secondary" className="mt-1">
            {detail?.type || "Disease"}
          </Badge>
        </div>
      </div>

      {/* 描述 */}
      {detail?.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">描述</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{detail.description}</p>
        </div>
      )}

      {/* 成因 */}
      {detail?.causes && detail.causes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">成因分析</h4>
          <div className="flex flex-wrap gap-1.5">
            {detail.causes.map((cause, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {cause.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 严重程度 */}
      {(detail?.severity_low || detail?.severity_medium || detail?.severity_high) && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">严重程度</h4>
          <div className="space-y-2">
            {detail.severity_low && (
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs font-medium text-green-700">轻度</p>
                <p className="text-xs text-green-600 mt-0.5">{detail.severity_low}</p>
              </div>
            )}
            {detail.severity_medium && (
              <div className="bg-yellow-50 rounded-lg p-2">
                <p className="text-xs font-medium text-yellow-700">中度</p>
                <p className="text-xs text-yellow-600 mt-0.5">{detail.severity_medium}</p>
              </div>
            )}
            {detail.severity_high && (
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs font-medium text-red-700">重度</p>
                <p className="text-xs text-red-600 mt-0.5">{detail.severity_high}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 修复方法 */}
      {detail?.repair_methods && detail.repair_methods.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">修复方案</h4>
          <div className="space-y-2">
            {detail.repair_methods.map((repair, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-sm text-gray-900">{repair.method}</p>
                <p className="text-xs text-gray-500 mt-0.5">{repair.description}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-blue-600">{repair.cost}</span>
                  <span className="text-xs text-gray-400">{repair.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关联病害 */}
      {detail?.related_codes && detail.related_codes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">关联病害</h4>
          <div className="flex flex-wrap gap-1.5">
            {detail.related_codes.map((code) => (
              <Badge
                key={code}
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: `${DAMAGE_COLORS[code] || "#6b7280"}20`, color: DAMAGE_COLORS[code] || "#6b7280" }}
              >
                {code}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
