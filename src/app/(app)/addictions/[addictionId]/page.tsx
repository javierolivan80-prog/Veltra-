"use client";

import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { LiveDurationCounter } from "@/design-system/components/LiveDurationCounter";
import { StatNumber } from "@/design-system/components/StatNumber";
import { AddictionFormDialog } from "@/features/addictions/AddictionFormDialog";
import { useAddiction, useDeleteAddiction, useDeleteRelapse, useRelapses } from "@/features/addictions/hooks";
import { RelapseDialog } from "@/features/addictions/RelapseDialog";
import { avgDaysBetweenRelapses, computeTrend, currentStreakStartMs, longestStreakMs } from "@/features/addictions/stats";
import { formatDateLong, formatRelativeTime } from "@/lib/format";

const TREND_LABEL: Record<string, { text: string; color: string }> = {
  improving: { text: "Mejorando — las rachas son más largas", color: "text-progress" },
  worsening: { text: "Empeorando — las rachas son más cortas", color: "text-danger" },
  stable: { text: "Estable", color: "text-ink-dim" },
  not_enough_data: { text: "Todavía sin datos suficientes", color: "text-ink-faint" },
};

export default function AddictionDetailPage() {
  const params = useParams<{ addictionId: string }>();
  const router = useRouter();
  const { data: addiction } = useAddiction(params.addictionId ?? null);
  const { data: relapses = [] } = useRelapses(params.addictionId ?? null);
  const deleteAddiction = useDeleteAddiction();
  const deleteRelapse = useDeleteRelapse();
  const [editOpen, setEditOpen] = useState(false);
  const [relapseOpen, setRelapseOpen] = useState(false);

  const streakStartMs = useMemo(() => (addiction ? currentStreakStartMs(addiction, relapses) : 0), [addiction, relapses]);
  const longestMs = useMemo(() => (addiction ? longestStreakMs(addiction, relapses) : 0), [addiction, relapses]);
  const avgDays = useMemo(() => avgDaysBetweenRelapses(relapses), [relapses]);
  const trend = useMemo(() => (addiction ? computeTrend(addiction, relapses) : "not_enough_data"), [addiction, relapses]);

  if (!addiction) return null;

  const remove = async () => {
    if (!confirm(`¿Borrar "${addiction.name}"? Se perderá todo su histórico de caídas.`)) return;
    await deleteAddiction.mutateAsync(addiction.id);
    router.replace("/addictions");
  };

  const removeRelapse = async (id: string) => {
    if (!confirm("¿Borrar esta caída del histórico?")) return;
    await deleteRelapse.mutateAsync(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/addictions")} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim" aria-label="Editar">
            <Pencil size={15} />
          </button>
          <button onClick={remove} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-danger" aria-label="Borrar">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <Card raised className="bg-addiction-bg border-addiction/30">
        <p className="text-ink text-xl font-display">{addiction.name}</p>
        <div className="mt-3">
          <LiveDurationCounter sinceMs={streakStartMs} color="text-addiction" />
        </div>
        {addiction.motivation ? <p className="text-ink-dim text-sm mt-3 leading-5">&ldquo;{addiction.motivation}&rdquo;</p> : null}
        <button onClick={() => setRelapseOpen(true)} className="mt-4 w-full py-3 rounded-2xl bg-addiction text-bg-deep font-bold">
          Caí
        </button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={Math.floor(longestMs / 86400000)} unit="días" size="md" color="text-record" label="Racha más larga" />
        </Card>
        <Card raised>
          <StatNumber value={avgDays !== null ? Math.round(avgDays) : "—"} unit={avgDays !== null ? "días" : ""} size="md" color="text-info" label="Promedio entre caídas" />
        </Card>
        <Card raised>
          <StatNumber value={relapses.length} unit="veces" size="md" color="text-ink" label="Total de caídas" />
        </Card>
        <Card raised>
          <p className={`text-sm font-semibold ${TREND_LABEL[trend].color}`}>{TREND_LABEL[trend].text}</p>
          <p className="text-ink-dim text-xs mt-1">Tendencia</p>
        </Card>
      </div>

      <div>
        <p className="text-ink text-lg font-display mb-3">Histórico de caídas</p>
        {relapses.length === 0 ? (
          <Card raised>
            <EmptyState title="Sin caídas registradas" description="Ojalá siga así." />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {relapses.map((r) => (
              <Card key={r.id} raised className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink font-semibold">{formatDateLong(r.fallenAt)}</p>
                  <p className="text-ink-faint text-xs mt-0.5">{formatRelativeTime(r.fallenAt)}</p>
                  {r.reason ? <p className="text-ink-dim text-sm mt-1.5 leading-5">{r.reason}</p> : null}
                </div>
                <button onClick={() => removeRelapse(r.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-faint hover:text-danger shrink-0" aria-label="Borrar">
                  <Trash2 size={14} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddictionFormDialog open={editOpen} onOpenChange={setEditOpen} addiction={addiction} />
      <RelapseDialog open={relapseOpen} onOpenChange={setRelapseOpen} addictionId={addiction.id} />
    </div>
  );
}
