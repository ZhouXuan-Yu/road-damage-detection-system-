export interface DetectionDamage {
  class_name: string;
  class_code: string;
  confidence: number;
  severity?: string;
  bbox_x?: number;
  bbox_y?: number;
  bbox_w?: number;
  bbox_h?: number;
  frame_index?: number;
}

export interface DetectionResult {
  record_id: number;
  filename: string;
  file_type: string;
  result_path: string;
  thumbnail_path?: string;
  total_count: number;
  avg_confidence: number;
  frame_count?: number;
  detection_data: Record<string, number>;
  damages: DetectionDamage[];
  created_at: string;
}

export interface VideoTask {
  task_id: string;
  status: string;
  message: string;
}
