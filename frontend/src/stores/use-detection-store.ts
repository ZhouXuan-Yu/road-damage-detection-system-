import { create } from "zustand";

interface DetectionState {
  file: File | null;
  fileType: "image" | "video";
  confidence: number;
  iou: number;
  isProcessing: boolean;
  progress: number;
  result: unknown | null;
  error: string | null;
  setFile: (file: File | null) => void;
  setFileType: (type: "image" | "video") => void;
  setConfidence: (conf: number) => void;
  setIou: (iou: number) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setResult: (result: unknown) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
  file: null,
  fileType: "image",
  confidence: 0.25,
  iou: 0.45,
  isProcessing: false,
  progress: 0,
  result: null,
  error: null,
  setFile: (file) => set({ file }),
  setFileType: (fileType) => set({ fileType }),
  setConfidence: (confidence) => set({ confidence }),
  setIou: (iou) => set({ iou }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      file: null,
      isProcessing: false,
      progress: 0,
      result: null,
      error: null,
    }),
}));
