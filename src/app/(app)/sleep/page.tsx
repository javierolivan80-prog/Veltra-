"use client";

import { Moon, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { LineChart } from "@/design-system/charts/LineChart";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { averageSleptMinutes, sleptMinutes, timeInBedMinutes } from "@/features/sleep/calc";
import { useDeleteSleepLog, useSleepLogByDate, useSleepLogs } from "@/features/sleep/hooks";
import { SleepLogDialog } from "@/features/sleep/SleepLogDialog";
import { dayLabel, lastNDayKeys, todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";
import type { SleepLog } from "@/types/models";

const GOAL_MIN_MINUTES = 7 * 60;
const GOAL_MAX_MINUTES = 8 * 60;

export default function SleepPage() {
  const today = todayKey();
  const { data: lastNight } = useSleepLogByDate(today);
  const { data: allLogs = [] } = useSleepLogs();
  const deleteSleepLog = useDeleteSleepLog();
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogExisting, setDialogExisting] = useState<SleepLog | null>(null);

  const last30 = useMemo(() => {
    const byDate = new Map(allLogs.map((l) => [l.date, l]));
    return lastNDayKeys(30)
      .map((date) => byDate.get(date))
      .filter((l): l is SleepLog => !!l);
  }, [allLogs]);

  const last7 = useMemo(() => last30.slice(-7), [last30]);
  const weeklyAvgMinutes = useMemo(() => averageSleptMinutes(last7), [last7]);

  const chartData = useMemo(() => last30.map((l) => ({ x: l.date, y: Math.round((sleptMinutes(l) / 60) * 10) / 10 })), [last30]);

  const lastNightMinutes = lastNight ? sleptMinutes(lastNight) : null;
  const goalProgress = lastNightMinutes !== null ? Math.min(1, lastNightMinutes / GOAL_MIN_MINUTES) : 0;

  const openDialog = (date: string, existing: SleepLog | null) => {
    setDialogDate(date);
    setDialogExisting(existing);
  };

  const removeLog = async (log: SleepLog) => {
    if (!confirm(`¿Borrar el registro de sueño del ${dayLabel(log.date)}?`)) return;
    await deleteSleepLog.mutateAsync(log.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/dashboard" label="Hoy" />
      <div>
        <p className="text-ink-dim text-sm">Cuerpo</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Sueño</h1>
      </div>

      {lastNight ? (
        <Card raised className="bg-sleep-bg border-sleep/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Anoche</p>
              <p className="text-ink text-2xl font-display mt-1">{formatHoursMinutes(lastNightMinutes ?? 0)}</p>
              {lastNight.quality !== null ? <p className="text-ink-dim text-sm mt-1">Calidad {lastNight.quality}/10</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <ProgressRing progress={goalProgress} size={56} strokeWidth={6} color="#8B93FF" trackColor="#221F22">
                <Moon size={18} className="text-sleep" />
              </ProgressRing>
              <button
                onClick={() => openDialog(today, lastNight)}
                className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim"
                aria-label="Editar"
              >
                <Pencil size={15} />
              </button>
            </div>
          </div>
          {lastNightMinutes !== null && lastNightMinutes < 360 ? (
            <p className="text-warn text-xs font-semibold mt-3 bg-warn-bg rounded-xl px-3 py-2">Dormiste menos de 6h — intenta acostarte antes hoy.</p>
          ) : null}
          {lastNightMinutes !== null && lastNightMinutes > 540 ? (
            <p className="text-info text-xs font-semibold mt-3 bg-info-bg rounded-xl px-3 py-2">Dormiste más de 9h — vigila si te sientes más cansado de lo normal.</p>
          ) : null}
        </Card>
      ) : (
        <Card raised>
          <EmptyState
            icon={<Moon size={28} className="text-sleep" />}
            title="Registra tu sueño de anoche"
            description="Cuéntanos a qué hora te acostaste, te dormiste, te despertaste y te levantaste."
            actionLabel="Registrar"
            onAction={() => openDialog(today, null)}
          />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={formatHoursMinutes(weeklyAvgMinutes)} size="md" color="text-sleep" label="Promedio semanal" />
        </Card>
        <Card raised>
          <StatNumber value={last30.length} unit="/ 30" size="md" color="text-ink" label="Noches registradas" />
        </Card>
      </div>

      <div>
        <SectionHeader title="Horas dormidas" subtitle="Últimos 30 días" />
        <Card raised>
          <LineChart data={chartData} color="#8B93FF" formatX={(v) => dayLabel(v)} />
        </Card>
      </div>

      {last30.length > 0 ? (
        <div>
          <SectionHeader title="Histórico" />
          <div className="flex flex-col gap-2">
            {[...last30].reverse().map((log) => (
              <Card key={log.id} raised className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink font-semibold">{dayLabel(log.date)}</p>
                  <p className="text-ink-dim text-xs mt-0.5 truncate">
                    {formatHoursMinutes(sleptMinutes(log))} dormido · {formatHoursMinutes(timeInBedMinutes(log))} en cama
                    {log.quality !== null ? ` · calidad ${log.quality}/10` : ""}
                  </p>
                  {log.notes ? <p className="text-ink-faint text-xs mt-1 truncate">{log.notes}</p> : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openDialog(log.date, log)} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-faint hover:text-ink" aria-label="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeLog(log)} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-faint hover:text-danger" aria-label="Borrar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <SleepLogDialog open={dialogDate !== null} onOpenChange={(open) => !open && setDialogDate(null)} date={dialogDate ?? today} existing={dialogExisting} />
    </div>
  );
}
