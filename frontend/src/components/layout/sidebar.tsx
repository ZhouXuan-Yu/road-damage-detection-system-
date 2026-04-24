"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radar,
  Upload,
  History,
  MessageSquare,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页概览", icon: Radar },
  { href: "/detect", label: "病害检测", icon: Upload },
  { href: "/history", label: "检测历史", icon: History },
  { href: "/ai", label: "AI 助手", icon: MessageSquare },
  { href: "/statistics", label: "数据统计", icon: BarChart3 },
  { href: "/knowledge", label: "知识图谱", icon: Radar },
  { href: "/reports", label: "报告管理", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 border-r border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
          <Radar className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">道路病害</h1>
          <p className="text-xs text-gray-500">智能检测系统</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700">YOLO11n 模型</p>
          <p className="text-xs text-gray-400 mt-0.5">mAP@0.5: 0.5018</p>
        </div>
      </div>
    </aside>
  );
}
