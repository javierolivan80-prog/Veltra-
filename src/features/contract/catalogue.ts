import type { CommitmentKind, ContractFocus, TimeSlot } from "@/types/models";

/** Días en convención JS (0 = domingo). La UI los pinta empezando en lunes,
 *  que es como se lee una semana aquí. */
export const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: "morning", label: "Mañana" },
  { value: "afternoon", label: "Tarde" },
  { value: "evening", label: "Noche" },
];

export const SLOT_LABEL: Record<TimeSlot, string> = { morning: "Mañana", afternoon: "Tarde", evening: "Noche" };

/** Orden en que se recorre el día. Es lo que ordena los bloques de Hoy. */
export const SLOT_ORDER: Record<TimeSlot, number> = { morning: 0, afternoon: 1, evening: 2 };

export const FOCUS_OPTIONS: { value: ContractFocus; title: string; description: string }[] = [
  { value: "body", title: "Estar más fuerte y descansado", description: "Entrenamiento, sueño y lo que comes." },
  { value: "mind", title: "Tener la cabeza en su sitio", description: "Foco, meditación y escribir lo que te pasa." },
  { value: "recovery", title: "Dejar algo que me está costando", description: "Cortar con algo y sostener el corte." },
  { value: "routine", title: "Ordenar mi día", description: "Rutinas que se sostienen sin pensarlas." },
];

export interface CommitmentTemplate {
  kind: CommitmentKind;
  title: string;
  /** Lo que hará el usuario, en concreto. El paso 2 pide compromisos
   *  repetibles, no intenciones. */
  detail: string;
  defaultDays: number[];
  defaultSlot: TimeSlot;
  /** Un compromiso libre que el usuario titula él mismo. */
  custom?: boolean;
}

export const COMMITMENT_TEMPLATES: CommitmentTemplate[] = [
  { kind: "workout", title: "Entrenar", detail: "Una sesión completa, la que toque de tu rutina.", defaultDays: [1, 3, 5], defaultSlot: "evening" },
  { kind: "sleep", title: "Dormir 7-8 horas", detail: "Registrar cómo has dormido al levantarte.", defaultDays: EVERY_DAY, defaultSlot: "morning" },
  { kind: "nutrition", title: "Registrar lo que como", detail: "Apuntar las comidas del día, aunque sea a ojo.", defaultDays: EVERY_DAY, defaultSlot: "evening" },
  { kind: "meditation", title: "Meditar", detail: "Una sesión corta, diez minutos bastan.", defaultDays: WEEKDAYS, defaultSlot: "morning" },
  { kind: "journaling", title: "Escribir el día", detail: "Dos líneas sobre cómo ha ido.", defaultDays: WEEKDAYS, defaultSlot: "evening" },
  { kind: "focus", title: "Un bloque de foco", detail: "Trabajo sin interrupciones, con el temporizador.", defaultDays: WEEKDAYS, defaultSlot: "morning" },
  { kind: "habit", title: "Un hábito mío", detail: "Lo defines tú: concreto y repetible.", defaultDays: WEEKDAYS, defaultSlot: "morning", custom: true },
];

/** El foco no restringe: solo pone delante lo que encaja con lo que el
 *  usuario acaba de decir que quiere cambiar. */
const FOCUS_PRIORITY: Record<ContractFocus, CommitmentKind[]> = {
  body: ["workout", "sleep", "nutrition"],
  mind: ["meditation", "journaling", "focus"],
  recovery: ["habit", "sleep", "focus"],
  routine: ["habit", "focus", "sleep"],
};

export function templatesForFocus(focus: ContractFocus): CommitmentTemplate[] {
  const priority = FOCUS_PRIORITY[focus];
  return [...COMMITMENT_TEMPLATES].sort((a, b) => {
    const ai = priority.indexOf(a.kind);
    const bi = priority.indexOf(b.kind);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export const MIN_COMMITMENTS = 3;
export const MAX_COMMITMENTS = 5;

export const DURATION_OPTIONS = [30, 60, 90];

/** A dónde lleva cada tipo de compromiso para cumplirlo. */
export const KIND_HREF: Record<CommitmentKind, string> = {
  workout: "/routines",
  sleep: "/sleep",
  nutrition: "/food",
  meditation: "/meditation",
  journaling: "/journal",
  focus: "/focus",
  habit: "/habits",
};

/** Cuántos días marcados tiene, dicho como lo diría una persona. */
export function frequencyLabel(days: number[]): string {
  if (days.length === 7) return "Todos los días";
  if (days.length === 0) return "Sin días";
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return "De lunes a viernes";
  return `${days.length} ${days.length === 1 ? "día" : "días"} por semana`;
}
