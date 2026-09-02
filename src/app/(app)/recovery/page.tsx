"use client";

import { CheckCircle2, Circle, Cpu, Footprints, LifeBuoy, PhoneCall, Plus, ShieldAlert, Shuffle, Smartphone, Wind, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { ModuleCard } from "@/design-system/components/ModuleCard";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { AddictionFormDialog } from "@/features/addictions/AddictionFormDialog";
import { useAddictions, useRelapses } from "@/features/addictions/hooks";
import { RelapseDialog } from "@/features/addictions/RelapseDialog";
import { currentStreakStartMs, longestStreakMs, computeTrend, type Trend } from "@/features/addictions/stats";
import { useScreenTimeByDate } from "@/features/screenTime/hooks";
import { formatDateLong } from "@/lib/format";
import { todayKey } from "@/lib/date";

const MILESTONES = [
  { days: 1, label: "Primer día" },
  { days: 7, label: "1 semana" },
  { days: 30, label: "1 mes" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "1 año" },
];

const CRAVING_TOOLS: { icon: LucideIcon; title: string; meta: string }[] = [
  { icon: Wind, title: "Respira 4-7-8", meta: "Inhala 4s, aguanta 7s, suelta 8s. Repite 4 veces." },
  { icon: Footprints, title: "Sal a caminar", meta: "Aunque sean 5 minutos alrededor de la manzana." },
  { icon: PhoneCall, title: "Llama a alguien", meta: "No hace falta explicar nada, solo hablar." },
  { icon: Shuffle, title: "Cambia de escena", meta: "Ducha fría, música alta o sal de la habitación." },
];

const TREND_TEXT: Record<Trend, string> = {
  improving: "Tu racha actual es más larga que tu media anterior — vas mejorando.",
  worsening: "Esta racha es más corta que tu media anterior. No pasa nada, sigue intentándolo.",
  stable: "Tu ritmo se mantiene estable respecto a rachas anteriores.",
  not_enough_data: "Aún no hay histórico suficiente para ver una tendencia.",
};

export default function RecoveryPage() {
  const { data: addictions = [] } = useAddictions();
  const { data: todayScreenTime } = useScreenTimeByDate(todayKey());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [relapseOpen, setRelapseOpen] = useState(false);
  const [panicOpen, setPanicOpen] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const selected = useMemo(() => addictions.find((a) => a.id === selectedId) ?? addictions[0] ?? null, [addictions, selectedId]);
  const { data: relapses = [] } = useRelapses(selected?.id ?? null);

  const streakStartMs = useMemo(() => (selected ? currentStreakStartMs(selected, relapses) : 0), [selected, relapses]);
  const longestMs = useMemo(() => (selected ? longestStreakMs(selected, relapses) : 0), [selected, relapses]);
  const trend = useMemo(() => (selected ? computeTrend(selected, relapses) : "not_enough_data"), [selected, relapses]);

  const currentDays = selected ? Math.floor((nowMs - streakStartMs) / 86400000) : 0;
  const longestDays = Math.floor(longestMs / 86400000);

  const ringProgress = useMemo(() => {
    const prev = [...MILESTONES].reverse().find((m) => m.days <= currentDays)?.days ?? 0;
    const next = MILESTONES.find((m) => m.days > currentDays)?.days ?? prev;
    return next > prev ? (currentDays - prev) / (next - prev) : 1;
  }, [currentDays]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Adicciones · Antojos · Apoyo</p>
          <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">Recuperación</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim shrink-0"
          aria-label="Nueva adicción"
        >
          <Plus size={18} />
        </button>
      </div>

      {addictions.length > 1 ? (
        <SegmentedControl options={addictions.map((a) => ({ value: a.id, label: a.name }))} value={selected?.id ?? ""} onChange={setSelectedId} />
      ) : null}

      {selected ? (
        <>
          <div className="flex flex-col items-center py-2">
            <ProgressRing progress={ringProgress} size={180} strokeWidth={3} color="#FF6A3D" trackColor="#1B1B1E">
              <div className="flex flex-col items-center gap-1">
                <span className="text-ink font-display font-semibold text-[52px] leading-none tracking-tight">{currentDays}</span>
                <span className="text-ink-faint text-[11px] font-bold uppercase tracking-[.16em]">Días limpio</span>
              </div>
            </ProgressRing>
            <p className="text-ink-faint text-xs mt-3">
              Desde {formatDateLong(selected.startDate)} · mejor racha {longestDays} días
            </p>
          </div>

          <button
            onClick={() => setPanicOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-2 border border-addiction text-addiction font-semibold text-[15px] py-3.5 rounded-xl hover:bg-addiction/10 transition-colors"
          >
            <LifeBuoy size={17} />
            {panicOpen ? "Ocultar herramientas" : "Ahora mismo tengo un antojo"}
          </button>

          {panicOpen ? (
            <div className="bg-addiction-bg border border-addiction/25 rounded-2xl px-4 py-4">
              <p className="text-[#FFB08A] text-[11px] font-bold uppercase tracking-[.14em]">Ahora mismo</p>
              <p className="text-ink text-sm leading-5 mt-2">El antojo dura entre 3 y 5 minutos. Elige una herramienta y aguanta ese rato.</p>
              <div className="flex flex-col gap-2 mt-3.5">
                {CRAVING_TOOLS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div key={t.title} className="flex items-center gap-3 bg-bg border border-addiction/20 rounded-lg px-3.5 py-3">
                      <Icon size={17} className="text-addiction shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm font-semibold">{t.title}</p>
                        <p className="text-ink-faint text-xs mt-0.5">{t.meta}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Hitos</p>
            <div className="flex flex-col gap-2">
              {MILESTONES.map((m) => {
                const achieved = currentDays >= m.days;
                return (
                  <div key={m.days} className="flex items-center gap-3 bg-[#0E0E0E] border border-line-subtle rounded-lg px-3.5 py-3">
                    {achieved ? <CheckCircle2 size={18} className="text-addiction shrink-0" /> : <Circle size={18} className="text-line shrink-0" />}
                    <span className={achieved ? "flex-1 text-ink text-[14.5px] font-semibold" : "flex-1 text-ink-dim text-[14.5px] font-semibold"}>{m.label}</span>
                    <span className="text-ink-faint text-xs shrink-0">{achieved ? `${m.days} días` : `faltan ${m.days - currentDays} días`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line-subtle pt-4 flex items-center gap-3">
            <Cpu size={17} className="text-ai shrink-0" />
            <p className="flex-1 text-ink-dim text-[13px] leading-snug">{TREND_TEXT[trend]}</p>
          </div>

          <button onClick={() => setRelapseOpen(true)} className="text-ink-faint text-xs font-semibold underline underline-offset-2 self-start">
            Registrar una caída
          </button>
        </>
      ) : (
        <Card raised>
          <EmptyState
            icon={<ShieldAlert size={28} className="text-addiction" />}
            title="Todavía no rastreas nada"
            description="Añade lo que quieras dejar y Veltra contará el tiempo que llevas sin caer."
            actionLabel="Añadir"
            onAction={() => setFormOpen(true)}
          />
        </Card>
      )}

      <div className="flex flex-col mt-2">
        <ModuleCard
          href="/addictions"
          icon={ShieldAlert}
          name="Todas las adicciones"
          quickStat={addictions.length > 0 ? `${addictions.length} en seguimiento` : "Sin seguimiento"}
          colorClass="text-addiction"
        />
        <ModuleCard
          href="/screen-time"
          icon={Smartphone}
          name="Screen Time"
          quickStat={todayScreenTime ? `${todayScreenTime.hours}h hoy` : "Sin registrar hoy"}
          colorClass="text-addiction"
          last
        />
      </div>

      <AddictionFormDialog open={formOpen} onOpenChange={setFormOpen} />
      {selected ? <RelapseDialog open={relapseOpen} onOpenChange={setRelapseOpen} addictionId={selected.id} /> : null}
    </div>
  );
}
