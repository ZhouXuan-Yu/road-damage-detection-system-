import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAMAGE_NAMES: Record<string, string> = {
  D00: "纵向裂缝",
  D01: "纵向裂缝",
  D10: "横向裂缝",
  D11: "横向裂缝",
  D20: "龟裂/网裂",
  D40: "坑洞/块裂",
  D43: "井盖沉降",
  D44: "车辙",
  D50: "障碍物",
};

export const DAMAGE_COLORS: Record<string, string> = {
  D00: "#ef4444",
  D01: "#f87171",
  D10: "#f97316",
  D11: "#fb923c",
  D20: "#eab308",
  D40: "#22c55e",
  D43: "#06b6d4",
  D44: "#3b82f6",
  D50: "#8b5cf6",
};
