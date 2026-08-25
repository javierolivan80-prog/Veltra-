"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { StatNumber } from "@/design-system/components/StatNumber";
import { useRecentSessions } from "@/features/workouts/hooks";
import { formatDateLong } from "@/lib/format";

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export default function HistoryPage() {
  const { data: sessions = [], isLoading } = useRecentSessions(100);

  // Grouped by month so a long history stays scannable.
  const groups = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const key = monthLabel(s.startedAt);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [sessions]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      const d = new Date(s.startedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [sessions]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-2xl font-display">Historial</h1>
        <p className="text-ink-dim text-sm mt-0.5">Todos tus entrenamientos completados</p>
      </div>

      {!isLoading && sessions.length === 0 ? (
        <Card raised>
          <EmptyState title="Aún no hay entrenamientos" description="Cuando termines tu primera sesión aparecerá aquí, con todo lo que registraste." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card raised>
              <StatNumber value={sessions.length} size="md" color="text-ink" label="Sesiones totales" />
            </Card>
            <Card raised>
              <StatNumber value={thisMonthCount} size="md" color="text-progress" label="Este mes" />
            </Card>
          </div>

          {groups.map(([month, monthSessions]) => (
            <div key={month}>
              <p className="text-ink-faint text-xs font-semibold uppercase tracking-wider mb-2.5 capitalize">{month}</p>
              <div className="flex flex-col gap-2.5">
                {monthSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/history/${s.id}`}
                    className="rounded-3xl border border-line-subtle bg-surface-raised p-4 flex items-center justify-between hover:border-line transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-ink text-base font-semibold truncate">{s.routineName ?? "Sesión libre"}</p>
                      <p className="text-ink-faint text-xs mt-1">{formatDateLong(s.startedAt)}</p>
                    </div>
                    <ChevronRight size={18} className="text-ink-faint shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
