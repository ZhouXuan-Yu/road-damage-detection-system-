"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface RepairMethod {
  method: string;
  description: string;
  cost: string;
  time: string;
}

interface KnowledgeFormData {
  code: string;
  name: string;
  type: string;
  description: string;
  causes: string;
  severity_low: string;
  severity_medium: string;
  severity_high: string;
  repair_methods: RepairMethod[];
  related_codes: string;
  cost_range: string;
  priority: number;
}

interface KnowledgeFormProps {
  mode: "create" | "edit";
  initialData?: {
    code: string;
    name: string;
    type: string;
    description: string;
    causes?: Array<{ name: string }>;
    severity_low?: string;
    severity_medium?: string;
    severity_high?: string;
    repair_methods?: RepairMethod[];
    related_codes?: string[];
    cost_range?: string;
    priority?: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function KnowledgeForm({ mode, initialData, onSuccess, onCancel }: KnowledgeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<KnowledgeFormData>({
    code: initialData?.code || "",
    name: initialData?.name || "",
    type: initialData?.type || "Disease",
    description: initialData?.description || "",
    causes: initialData?.causes?.map((c) => c.name).join(", ") || "",
    severity_low: initialData?.severity_low || "",
    severity_medium: initialData?.severity_medium || "",
    severity_high: initialData?.severity_high || "",
    repair_methods: initialData?.repair_methods || [],
    related_codes: initialData?.related_codes?.join(", ") || "",
    cost_range: initialData?.cost_range || "",
    priority: initialData?.priority || 3,
  });

  const [newRepairMethod, setNewRepairMethod] = useState<RepairMethod>({
    method: "",
    description: "",
    cost: "",
    time: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 格式化数据
      const data = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        description: formData.description,
        causes: formData.causes.split(",").map((c) => c.trim()).filter(Boolean).map((name) => ({
          name,
          description: "",
        })),
        severity_low: formData.severity_low || null,
        severity_medium: formData.severity_medium || null,
        severity_high: formData.severity_high || null,
        repair_methods: formData.repair_methods.filter((r) => r.method),
        related_codes: formData.related_codes.split(",").map((c) => c.trim()).filter(Boolean),
        cost_range: formData.cost_range || null,
        priority: formData.priority,
      };

      if (mode === "create") {
        await api.kg.create(data);
      } else {
        await api.kg.update(formData.code, data);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "保存失败");
    } finally {
      setLoading(false);
    }
  };

  const addRepairMethod = () => {
    if (newRepairMethod.method) {
      setFormData({
        ...formData,
        repair_methods: [...formData.repair_methods, { ...newRepairMethod }],
      });
      setNewRepairMethod({ method: "", description: "", cost: "", time: "" });
    }
  };

  const removeRepairMethod = (index: number) => {
    setFormData({
      ...formData,
      repair_methods: formData.repair_methods.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            病害编码 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="如 D00"
            disabled={mode === "edit"}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            病害名称 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="如 纵向裂缝"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Disease">病害</option>
            <option value="Obstacle">障碍物</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1 - 最低</option>
            <option value="2">2 - 较低</option>
            <option value="3">3 - 中等</option>
            <option value="4">4 - 较高</option>
            <option value="5">5 - 最高</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="病害描述..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          成因 <span className="text-gray-400">(逗号分隔)</span>
        </label>
        <Input
          value={formData.causes}
          onChange={(e) => setFormData({ ...formData, causes: e.target.value })}
          placeholder="路面老化, 温度应力, 超载交通"
        />
      </div>

      {/* 严重程度 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">严重程度描述</label>
        <Input
          value={formData.severity_low}
          onChange={(e) => setFormData({ ...formData, severity_low: e.target.value })}
          placeholder="轻度: 裂缝宽度 < 3mm"
        />
        <Input
          value={formData.severity_medium}
          onChange={(e) => setFormData({ ...formData, severity_medium: e.target.value })}
          placeholder="中度: 裂缝宽度 3-10mm"
        />
        <Input
          value={formData.severity_high}
          onChange={(e) => setFormData({ ...formData, severity_high: e.target.value })}
          placeholder="重度: 裂缝宽度 > 10mm"
        />
      </div>

      {/* 修复方法 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">修复方法</label>

        {/* 已添加的修复方法 */}
        {formData.repair_methods.length > 0 && (
          <div className="space-y-2">
            {formData.repair_methods.map((method, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{method.method}</p>
                  <p className="text-xs text-gray-500">{method.description}</p>
                  <p className="text-xs text-blue-600">{method.cost} | {method.time}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRepairMethod(index)}
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 添加新的修复方法 */}
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={newRepairMethod.method}
            onChange={(e) => setNewRepairMethod({ ...newRepairMethod, method: e.target.value })}
            placeholder="方法名称"
          />
          <Input
            value={newRepairMethod.cost}
            onChange={(e) => setNewRepairMethod({ ...newRepairMethod, cost: e.target.value })}
            placeholder="费用"
          />
        </div>
        <Input
          value={newRepairMethod.description}
          onChange={(e) => setNewRepairMethod({ ...newRepairMethod, description: e.target.value })}
          placeholder="描述"
        />
        <Input
          value={newRepairMethod.time}
          onChange={(e) => setNewRepairMethod({ ...newRepairMethod, time: e.target.value })}
          placeholder="工期"
        />
        <Button type="button" variant="outline" size="sm" onClick={addRepairMethod}>
          + 添加修复方法
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          关联病害 <span className="text-gray-400">(逗号分隔)</span>
        </label>
        <Input
          value={formData.related_codes}
          onChange={(e) => setFormData({ ...formData, related_codes: e.target.value })}
          placeholder="D01, D20, D40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">费用范围</label>
        <Input
          value={formData.cost_range}
          onChange={(e) => setFormData({ ...formData, cost_range: e.target.value })}
          placeholder="20-300 元/m"
        />
      </div>

      {/* 按钮 */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : mode === "create" ? "创建" : "保存"}
        </Button>
      </div>
    </form>
  );
}
