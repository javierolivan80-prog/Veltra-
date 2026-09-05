"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lastNDayKeys, shiftDayKey, todayKey } from "@/lib/date";
import type { Commitment, CommitmentKind } from "@/types/models";
import { frequencyLabel } from "./catalogue";
import { contractKeys } from "./hooks";
import { pushAdaptiveNotice } from "./notices";
import * as repo from "./repo";

export type DoneDaysByKind = Partial<Record<CommitmentKind, Set<string>>>;

export interface AutoReduction {
  commitment: Commitment;
  proposedDays: number[];
}

function isDueOn(days: number[], key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  return days.includes(new Date(y, m - 1, d).getDay());
}

/**
 * Racha de días marcados seguidos sin cumplir, contando solo desde el
 * último cambio de horario del compromiso (manual o automático) — así un
 * ajuste no se encadena con fallos de antes del cambio anterior.
 */
export function trailingMissStreak(commitment: Commitment, doneDays: Set<string>, referenceDate: string): number {
  const sinceKey = commitment.updatedAt.slice(0, 10);
  const yesterday = shiftDayKey(referenceDate, -1);
  // 21 días cubre de sobra hasta un compromiso de 1 día/semana con 3 fallos seguidos.
  const dueDays = lastNDayKeys(21, yesterday).filter((d) => d > sinceKey && isDueOn(commitment.days, d));
  let streak = 0;
  for (let i = dueDays.length - 1; i >= 0; i--) {
    if (doneDays.has(dueDays[i])) break;
    streak++;
  }
  return streak;
}

/**
 * Compromisos que llevan tres días marcados seguidos sin cumplirse desde su
 * último cambio de horario. La app baja la frecuencia sola en vez de
 * esperar a que el usuario abandone del todo — quitando el último día
 * marcado, igual que la propuesta que la revisión semanal ofrecería, pero
 * sin esperar al domingo. No baja de un día por semana, y los hábitos
 * propios (sin fuente automática de "hecho") quedan fuera.
 */
export function detectAutoReductions(commitments: Commitment[], doneDaysByKind: DoneDaysByKind, referenceDate: string = todayKey()): AutoReduction[] {
  const reductions: AutoReduction[] = [];
  for (const c of commitments) {
    if (c.kind === "habit" || c.days.length <= 1) continue;
    const doneDays = doneDaysByKind[c.kind] ?? new Set<string>();
    if (trailingMissStreak(c, doneDays, referenceDate) >= 3) {
      const sorted = [...c.days].sort((a, b) => a - b);
      reductions.push({ commitment: c, proposedDays: sorted.slice(0, -1) });
    }
  }
  return reductions;
}

/** Aplica las reducciones detectadas y encola un aviso por cada una —
 *  "si no se aplica, la funcionalidad no existe" aplica aquí igual que en
 *  la revisión semanal: el ajuste tiene que llegar al compromiso de verdad. */
export function useApplyAutoReductions(commitments: Commitment[], doneDaysByKind: DoneDaysByKind) {
  const qc = useQueryClient();
  useEffect(() => {
    if (commitments.length === 0) return;
    let cancelled = false;
    (async () => {
      const reductions = detectAutoReductions(commitments, doneDaysByKind);
      if (reductions.length === 0) return;
      for (const r of reductions) {
        await repo.updateCommitmentSchedule(r.commitment.id, r.proposedDays, r.commitment.timeSlot);
        pushAdaptiveNotice(`Hemos reducido "${r.commitment.title}" a ${frequencyLabel(r.proposedDays)} — llevabas 3 seguidos sin cumplirlo.`);
      }
      if (!cancelled) qc.invalidateQueries({ queryKey: contractKeys.all });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitments, doneDaysByKind]);
}
