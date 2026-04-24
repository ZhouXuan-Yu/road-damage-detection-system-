"use client";

import { cn } from "@/lib/utils";

interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({ message = "加载中...", className }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  );
}
