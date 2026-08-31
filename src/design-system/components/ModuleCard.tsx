"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

/** Icon + name + one quick stat, used on the Cuerpo/Mente/Recuperación/Vida grids. */
export function ModuleCard({
  href,
  icon: Icon,
  name,
  quickStat,
  colorClass,
  bgClass,
}: {
  href: string;
  icon: LucideIcon;
  name: string;
  quickStat?: string;
  colorClass: string; // e.g. "text-info"
  bgClass: string; // e.g. "bg-info-bg border-info/30"
}) {
  return (
    <Link href={href} className={`flex items-center gap-3.5 rounded-2xl border p-4 bg-surface-raised border-line-subtle hover:border-line transition-colors`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon size={19} className={colorClass} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink font-semibold truncate">{name}</p>
        {quickStat ? <p className="text-ink-dim text-xs mt-0.5 truncate">{quickStat}</p> : null}
      </div>
      <ChevronRight size={16} className="text-ink-faint shrink-0" />
    </Link>
  );
}
