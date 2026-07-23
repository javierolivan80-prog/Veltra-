"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { dayLabel } from "@/features/food/dates";
import { useFoodConversations } from "@/features/food/hooks";

export default function FoodHistoryPage() {
  const { data: conversations = [] } = useFoodConversations();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/food" className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-ink text-2xl font-display">Historial</h1>
          <p className="text-ink-dim text-sm mt-0.5">Abre cualquier día para ver su chat y comidas</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <Card raised>
          <EmptyState title="Aún no hay días registrados" description="Cuando registres tu primera comida, cada día aparecerá aquí para consultarlo cuando quieras." />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/food/${conv.id}`}
              className="rounded-3xl border border-line-subtle bg-surface-raised p-5 flex items-center justify-between hover:border-line transition-colors"
            >
              <div className="min-w-0">
                <p className="text-ink text-base font-semibold capitalize">{dayLabel(conv.date)}</p>
                <p className="text-ink-faint text-xs mt-0.5">{conv.date}</p>
              </div>
              <ChevronRight size={20} className="text-ink-faint shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
