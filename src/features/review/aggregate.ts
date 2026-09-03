import { lastNDayKeys, shiftDayKey, todayKey } from "@/lib/date";
import type { Commitment, CommitmentKind, TimeSlot } from "@/types/models";

export interface CommitmentStat {
  commitmentId: string;
  kind: CommitmentKind;
  title: string;
  days: number[];
  timeSlot: TimeSlot;
  due7d: number;
  done7d: number;
  due28d: number;
  done28d: number;
  /** Los hábitos propios no tienen una fuente automática de "hecho": se
   *  marcan en su propio módulo, sin ligarse a este compromiso. La revisión
   *  los cuenta pero nunca les propone un cambio ni afirma un patrón sobre
   *  ellos con datos que no tiene. */
  measurable: boolean;
}

export interface ReviewAggregate {
  /** Day-key del primer día de la ventana de 7 (el domingo/lunes que abre
   *  la semana revisada, según cuándo se dispare la revisión). */
  weekStart: string;
  commitments: CommitmentStat[];
}

/** Un día por tipo de compromiso completado, para resolver "¿tocaba y se
 *  hizo?" sin repetir consultas por compromiso — varios compromisos pueden
 *  compartir kind. */
export type DoneDaysByKind = Partial<Record<CommitmentKind, Set<string>>>;

function isDueOn(days: number[], dayKeyStr: string): boolean {
  const [y, m, d] = dayKeyStr.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return days.includes(weekday);
}

/** Primer día de la ventana de 7 completa más reciente (termina ayer, no
 *  hoy). Es el `weekStart` que identifica una revisión de forma única. */
export function currentReviewWeekStart(referenceDate: string = todayKey()): string {
  return lastNDayKeys(7, shiftDayKey(referenceDate, -1))[0];
}

/** Agrega cada compromiso contra las últimas ventanas de 7 y 28 días
 *  *completos* — terminan ayer, no hoy, porque el día de hoy todavía no ha
 *  pasado y contarlo penalizaría al usuario por algo que aún puede hacer. */
export function computeReviewAggregate(
  commitments: Commitment[],
  doneDaysByKind: DoneDaysByKind,
  referenceDate: string = todayKey()
): ReviewAggregate {
  const yesterday = shiftDayKey(referenceDate, -1);
  const window7 = lastNDayKeys(7, yesterday);
  const window28 = lastNDayKeys(28, yesterday);

  const commitmentStats: CommitmentStat[] = commitments.map((c) => {
    const doneDays = doneDaysByKind[c.kind] ?? new Set<string>();
    const due7 = window7.filter((d) => isDueOn(c.days, d));
    const due28 = window28.filter((d) => isDueOn(c.days, d));
    return {
      commitmentId: c.id,
      kind: c.kind,
      title: c.title,
      days: c.days,
      timeSlot: c.timeSlot,
      due7d: due7.length,
      done7d: due7.filter((d) => doneDays.has(d)).length,
      due28d: due28.length,
      done28d: due28.filter((d) => doneDays.has(d)).length,
      measurable: c.kind !== "habit",
    };
  });

  return { weekStart: window7[0], commitments: commitmentStats };
}
