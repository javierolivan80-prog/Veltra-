"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/components/EmptyState";
import { dayOfArc, daysLeft } from "@/features/contract/arc";
import { FOCUS_OPTIONS, TIME_SLOTS, WEEK_DAYS, frequencyLabel } from "@/features/contract/catalogue";
import { useActiveContract, useCommitments, useUpdateCommitmentSchedule } from "@/features/contract/hooks";
import { updateContractStatus } from "@/features/contract/repo";
import { cn } from "@/lib/cn";
import { formatDateLong } from "@/lib/format";
import type { TimeSlot } from "@/types/models";

export default function ContractPage() {
  const router = useRouter();
  const { data: contract, isLoading } = useActiveContract();
  const { data: commitments = [] } = useCommitments(contract?.id ?? null);
  const updateSchedule = useUpdateCommitmentSchedule();
  const [ending, setEnding] = useState(false);

  if (isLoading) return null;

  if (!contract) {
    return (
      <EmptyState
        title="No tienes contrato activo"
        description="Firma uno para tener un plan diario y un arco con final."
        actionLabel="Firmar contrato"
        onAction={() => router.push("/onboarding/contract")}
      />
    );
  }

  const focusLabel = FOCUS_OPTIONS.find((f) => f.value === contract.focus)?.title ?? "";
  const day = dayOfArc(contract);
  const left = daysLeft(contract);

  const endArc = async () => {
    if (!confirm("¿Terminar este arco? Se guarda en tu historial y podrás firmar uno nuevo. Lo que has registrado no se borra.")) return;
    setEnding(true);
    await updateContractStatus(contract.id, "abandoned");
    router.replace("/onboarding/contract");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Tu contrato</p>
        <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">{focusLabel}</h1>
        <p className="text-ink-dim text-sm mt-2">
          Día {day} de {contract.durationDays} · {left === 0 ? "terminado" : `quedan ${left} días`} · acaba el {formatDateLong(contract.endsOn)}
        </p>
      </div>

      <div className="border border-line-subtle rounded-2xl bg-surface px-4 py-4">
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Por qué lo haces</p>
        <p className="text-ink text-[15px] leading-6 mt-2">{contract.why}</p>
      </div>

      <div>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Tus compromisos</p>
        <div className="flex flex-col gap-3">
          {commitments.map((c) => (
            <div key={c.id} className="border border-line-subtle rounded-2xl bg-surface px-4 py-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-ink font-semibold">{c.title}</p>
                <p className="text-ink-faint text-xs shrink-0">{frequencyLabel(c.days)}</p>
              </div>
              <div className="flex gap-1.5 mt-3">
                {WEEK_DAYS.map((d) => {
                  const on = c.days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => {
                        const days = on ? c.days.filter((x) => x !== d.value) : [...c.days, d.value];
                        // Un compromiso sin días deja de ser un compromiso: el
                        // sitio para eso es terminar el arco, no vaciarlo.
                        if (days.length === 0) return;
                        updateSchedule.mutate({ id: c.id, days, timeSlot: c.timeSlot });
                      }}
                      className={cn(
                        "flex-1 h-9 rounded-lg border text-xs font-bold transition-colors",
                        on ? "bg-progress border-progress text-bg-deep" : "border-line-subtle text-ink-faint hover:text-ink"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-2.5">
                {TIME_SLOTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateSchedule.mutate({ id: c.id, days: c.days, timeSlot: s.value as TimeSlot })}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors",
                      c.timeSlot === s.value ? "bg-surface-hover border-line text-ink" : "border-line-subtle text-ink-faint hover:text-ink"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-ink-faint text-xs mt-3 leading-5">
          Puedes cambiar cuándo, no qué. Cambiar los compromisos a mitad de camino es firmar otro contrato — y eso ya existe: termina este y empieza uno nuevo.
        </p>
      </div>

      <div className="border-t border-line-subtle pt-5">
        <Button label="Terminar este arco" variant="danger" onClick={endArc} loading={ending} />
      </div>
    </div>
  );
}
