"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** "< Cuerpo" style back link, shown atop module pages reached from a category grid. */
export function CategoryBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-ink-dim text-sm font-semibold hover:text-ink -ml-1 mb-1">
      <ChevronLeft size={16} />
      {label}
    </Link>
  );
}
