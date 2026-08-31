"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Icon + name + one quick stat, styled as a divider row — same visual
 *  language as the "Después de esto" list on Hoy (colored left mark, plain
 *  colored icon, title + meta, chevron). Used on the category grids. */
export function ModuleCard({
  href,
  icon: Icon,
  name,
  quickStat,
  colorClass,
  last,
}: {
  href: string;
  icon: LucideIcon;
  name: string;
  quickStat?: string;
  colorClass: string; // e.g. "text-info"
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 w-full py-3.5 hover:bg-surface/60 transition-colors",
        !last && "border-b border-[#171717]"
      )}
    >
      <span className={cn("w-[2px] h-[26px] rounded-full shrink-0", colorClass.replace("text-", "bg-"))} />
      <Icon size={18} className={cn(colorClass, "shrink-0")} />
      <div className="flex-1 min-w-0">
        <p className="text-ink font-semibold truncate">{name}</p>
        {quickStat ? <p className="text-ink-faint text-xs mt-0.5 truncate">{quickStat}</p> : null}
      </div>
      <ChevronRight size={16} className="text-ink-faint shrink-0" />
    </Link>
  );
}
