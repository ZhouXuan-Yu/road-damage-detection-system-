"use client";

import { Slider } from "@/components/ui/slider";

interface DetectionPanelProps {
  confidence: number;
  iou: number;
  onConfidenceChange: (value: number) => void;
  onIouChange: (value: number) => void;
}

export function DetectionPanel({
  confidence,
  iou,
  onConfidenceChange,
  onIouChange,
}: DetectionPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">置信度阈值</label>
          <span className="text-sm font-semibold text-blue-600">{confidence.toFixed(2)}</span>
        </div>
        <Slider
          value={[confidence]}
          min={0.01}
          max={0.99}
          step={0.01}
          onValueChange={([v]) => onConfidenceChange(v)}
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0.01</span>
          <span>0.99</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">IoU 阈值</label>
          <span className="text-sm font-semibold text-blue-600">{iou.toFixed(2)}</span>
        </div>
        <Slider
          value={[iou]}
          min={0.01}
          max={0.99}
          step={0.01}
          onValueChange={([v]) => onIouChange(v)}
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0.01</span>
          <span>0.99</span>
        </div>
      </div>
    </div>
  );
}
