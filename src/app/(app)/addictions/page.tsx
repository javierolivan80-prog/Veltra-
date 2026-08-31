"use client";

import { Plus, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { LiveDurationCounter } from "@/design-system/components/LiveDurationCounter";
import { AddictionFormDialog } from "@/features/addictions/AddictionFormDialog";
import { useAddictions, useRelapses } from "@/features/addictions/hooks";
import { currentStreakStartMs } from "@/features/addictions/stats";
import { RelapseDialog } from "@/features/addictions/RelapseDialog";
import { formatRelativeTime } from "@/lib/format";
import type { Addiction } from "@/types/models";

function AddictionCard({ addiction, onOpen, onRelapse }: { addiction: Addiction; onOpen: () => void; onRelapse: () => void }) {
  const { data: relapses = [] } = useRelapses(addiction.id);
  const streakStartMs = currentStreakStartMs(addiction, relapses);
  const lastRelapse = relapses[0] ?? null;

  return (
    <Card raised className="bg-addiction-bg border-addiction/30">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 text-left flex-1">
          <p className="text-ink font-semibold">{addiction.name}</p>
          <div className="mt-2">
            <LiveDurationCounter sinceMs={streakStartMs} color="text-addiction" />
          </div>
        </button>
      </div>
      {addiction.motivation ? <p className="text-ink-dim text-sm mt-3 leading-5">&ldquo;{addiction.motivation}&rdquo;</p> : null}
      <div className="flex items-center justify-between mt-4 gap-3">
        <p className="text-ink-faint text-xs">
          {lastRelapse ? `Última caída ${formatRelativeTime(lastRelapse.fallenAt)}` : "Ninguna caída registrada"} · {relapses.length} en total
        </p>
        <button onClick={onRelapse} className="shrink-0 px-4 py-2 rounded-full bg-addiction text-bg-deep text-sm font-bold">
          Caí
        </button>
      </div>
    </Card>
  );
}

export default function AddictionsPage() {
  const router = useRouter();
  const { data: addictions = [] } = useAddictions();
  const [formOpen, setFormOpen] = useState(false);
  const [relapseFor, setRelapseFor] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/recovery" label="Recuperación" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink-dim text-sm">Recuperación</p>
          <h1 className="text-ink text-2xl font-display mt-0.5">Adicciones</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="w-11 h-11 rounded-full bg-addiction flex items-center justify-center text-bg-deep"
          aria-label="Nueva adicción"
        >
          <Plus size={20} />
        </button>
      </div>

      {addictions.length === 0 ? (
        <Card raised>
          <EmptyState
            icon={<ShieldAlert size={28} className="text-addiction" />}
            title="Todavía no rastreas nada"
            description="Añade lo que quieras dejar y Veltra contará el tiempo que llevas sin caer."
            actionLabel="Añadir"
            onAction={() => setFormOpen(true)}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {addictions.map((a) => (
            <AddictionCard key={a.id} addiction={a} onOpen={() => router.push(`/addictions/${a.id}`)} onRelapse={() => setRelapseFor(a.id)} />
          ))}
        </div>
      )}

      <AddictionFormDialog open={formOpen} onOpenChange={setFormOpen} />
      {relapseFor ? <RelapseDialog open={relapseFor !== null} onOpenChange={(open) => !open && setRelapseFor(null)} addictionId={relapseFor} /> : null}
    </div>
  );
}
