"use client";

import { Check, ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { TextAreaField, TextField } from "@/design-system/components/TextField";
import { cn } from "@/lib/cn";
import { shiftDayKey, todayKey } from "@/lib/date";
import {
  DURATION_OPTIONS,
  FOCUS_OPTIONS,
  MAX_COMMITMENTS,
  MIN_COMMITMENTS,
  TIME_SLOTS,
  WEEK_DAYS,
  frequencyLabel,
  templatesForFocus,
  type CommitmentTemplate,
} from "./catalogue";
import type { CommitmentDraft, ContractDraft } from "./repo";
import type { ContractFocus, TimeSlot } from "@/types/models";

const STEPS = ["focus", "commitments", "schedule", "duration", "why"] as const;
type Step = (typeof STEPS)[number];

function StepFrame({
  step,
  title,
  subtitle,
  onBack,
  children,
  footer,
}: {
  step: number;
  title: string;
  subtitle: string;
  onBack: (() => void) | null;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          {onBack ? (
            <button onClick={onBack} aria-label="Atrás" className="text-ink-faint hover:text-ink -ml-1">
              <ChevronLeft size={20} />
            </button>
          ) : null}
          <div className="flex-1 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-[3px] flex-1 rounded-full", i <= step ? "bg-progress" : "bg-line-subtle")} />
            ))}
          </div>
        </div>

        <h1 className="text-ink font-display font-semibold text-[26px] leading-tight tracking-tight">{title}</h1>
        <p className="text-ink-dim text-sm mt-2 leading-5">{subtitle}</p>

        <div className="flex-1 mt-7">{children}</div>
        <div className="pt-8">{footer}</div>
      </div>
    </div>
  );
}

export function ContractFlow({ onSubmit, submitting, error }: { onSubmit: (draft: ContractDraft) => void; submitting?: boolean; error?: string | null }) {
  const [step, setStep] = useState<Step>("focus");
  const [focus, setFocus] = useState<ContractFocus | null>(null);
  const [picked, setPicked] = useState<CommitmentDraft[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [durationDays, setDurationDays] = useState(90);
  const [why, setWhy] = useState("");

  const stepIndex = STEPS.indexOf(step);
  const templates = useMemo(() => (focus ? templatesForFocus(focus) : []), [focus]);
  const isPicked = (t: CommitmentTemplate) => picked.some((p) => p.kind === t.kind && (!t.custom || p.title === customTitle.trim()));
  const atMax = picked.length >= MAX_COMMITMENTS;

  const toggle = (t: CommitmentTemplate) => {
    const title = t.custom ? customTitle.trim() : t.title;
    if (t.custom && !title) return;
    setPicked((prev) => {
      const existing = prev.findIndex((p) => p.kind === t.kind);
      if (existing >= 0) return prev.filter((_, i) => i !== existing);
      if (prev.length >= MAX_COMMITMENTS) return prev;
      return [...prev, { kind: t.kind, title, days: t.defaultDays, timeSlot: t.defaultSlot }];
    });
  };

  const setDays = (index: number, days: number[]) => setPicked((prev) => prev.map((p, i) => (i === index ? { ...p, days } : p)));
  const setSlot = (index: number, timeSlot: TimeSlot) => setPicked((prev) => prev.map((p, i) => (i === index ? { ...p, timeSlot } : p)));

  const back = (to: Step) => () => setStep(to);

  if (step === "focus") {
    return (
      <StepFrame
        step={stepIndex}
        title="¿Qué quieres cambiar?"
        subtitle="Elige una. Ordena lo que te propongo después; no te encierra en nada."
        onBack={null}
        footer={<Button label="Seguir" fullWidth size="lg" disabled={!focus} onClick={() => setStep("commitments")} />}
      >
        <div className="flex flex-col gap-2.5">
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFocus(opt.value)}
              className={cn(
                "text-left border rounded-2xl px-4 py-4 transition-colors",
                focus === opt.value ? "border-progress bg-progress/5" : "border-line-subtle bg-surface hover:border-line"
              )}
            >
              <p className="text-ink font-semibold">{opt.title}</p>
              <p className="text-ink-faint text-[13px] mt-1 leading-5">{opt.description}</p>
            </button>
          ))}
        </div>
      </StepFrame>
    );
  }

  if (step === "commitments") {
    return (
      <StepFrame
        step={stepIndex}
        title="Elige tus compromisos"
        subtitle={`Entre ${MIN_COMMITMENTS} y ${MAX_COMMITMENTS}. Menos compromisos es más probabilidad de cumplirlos, así que el sexto no existe.`}
        onBack={back("focus")}
        footer={
          <div className="flex flex-col gap-3">
            <p className="text-ink-faint text-xs text-center">
              {picked.length} de {MAX_COMMITMENTS} elegidos
              {picked.length < MIN_COMMITMENTS ? ` · te faltan ${MIN_COMMITMENTS - picked.length}` : ""}
            </p>
            <Button label="Seguir" fullWidth size="lg" disabled={picked.length < MIN_COMMITMENTS} onClick={() => setStep("schedule")} />
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          {templates.map((t) => {
            const on = isPicked(t);
            const blocked = !on && atMax;
            return (
              <div key={t.kind}>
                <button
                  onClick={() => toggle(t)}
                  disabled={blocked || (t.custom && !customTitle.trim() && !on)}
                  className={cn(
                    "w-full text-left border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors",
                    on ? "border-progress bg-progress/5" : "border-line-subtle bg-surface",
                    blocked ? "opacity-40" : "hover:border-line"
                  )}
                >
                  <span className={cn("w-6 h-6 rounded-lg border flex items-center justify-center shrink-0", on ? "bg-progress border-progress" : "border-line")}>
                    {on ? <Check size={14} className="text-bg-deep" /> : null}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-ink font-semibold">{t.custom && customTitle.trim() ? customTitle.trim() : t.title}</span>
                    <span className="block text-ink-faint text-[13px] mt-0.5">{t.detail}</span>
                  </span>
                </button>
                {t.custom ? (
                  <div className="mt-2">
                    <TextField
                      placeholder="p. ej. Leer 20 minutos"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      disabled={isPicked(t)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </StepFrame>
    );
  }

  if (step === "schedule") {
    return (
      <StepFrame
        step={stepIndex}
        title="¿Cuándo?"
        subtitle="Los días que marques son la frecuencia. La franja ordena tu día — no te va a avisar a una hora exacta que no has elegido."
        onBack={back("commitments")}
        footer={
          <Button
            label="Seguir"
            fullWidth
            size="lg"
            disabled={picked.some((p) => p.days.length === 0)}
            onClick={() => setStep("duration")}
          />
        }
      >
        <div className="flex flex-col gap-4">
          {picked.map((p, i) => (
            <div key={p.kind} className="border border-line-subtle rounded-2xl px-4 py-4 bg-surface">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-ink font-semibold">{p.title}</p>
                <p className="text-ink-faint text-xs shrink-0">{frequencyLabel(p.days)}</p>
              </div>
              <div className="flex gap-1.5 mt-3">
                {WEEK_DAYS.map((d) => {
                  const on = p.days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => setDays(i, on ? p.days.filter((x) => x !== d.value) : [...p.days, d.value])}
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
                    onClick={() => setSlot(i, s.value)}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors",
                      p.timeSlot === s.value ? "bg-surface-hover border-line text-ink" : "border-line-subtle text-ink-faint hover:text-ink"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {p.days.length === 0 ? <p className="text-warn text-xs mt-2.5">Marca al menos un día.</p> : null}
            </div>
          ))}
        </div>
      </StepFrame>
    );
  }

  if (step === "duration") {
    const ends = shiftDayKey(todayKey(), durationDays - 1);
    const [y, m, d] = ends.split("-").map(Number);
    const endsLabel = new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return (
      <StepFrame
        step={stepIndex}
        title="¿Hasta cuándo?"
        subtitle="Un arco tiene final. Al terminarlo verás qué ha cambiado y decides si firmas otro."
        onBack={back("schedule")}
        footer={<Button label="Seguir" fullWidth size="lg" onClick={() => setStep("why")} />}
      >
        <div className="flex flex-col gap-2.5">
          {DURATION_OPTIONS.map((days) => (
            <button
              key={days}
              onClick={() => setDurationDays(days)}
              className={cn(
                "text-left border rounded-2xl px-4 py-4 transition-colors",
                durationDays === days ? "border-progress bg-progress/5" : "border-line-subtle bg-surface hover:border-line"
              )}
            >
              <p className="text-ink font-display font-semibold text-xl">{days} días</p>
            </button>
          ))}
        </div>
        <p className="text-ink-faint text-[13px] mt-4">Termina el {endsLabel}.</p>
      </StepFrame>
    );
  }

  return (
    <StepFrame
      step={stepIndex}
      title="¿Por qué lo haces?"
      subtitle="Una o dos frases, para ti. Te las voy a devolver el día que lleves tres fallando y no te apetezca nada."
      onBack={back("duration")}
      footer={
        <div className="flex flex-col gap-3">
          {error ? <p className="text-danger text-sm font-medium text-center">{error}</p> : null}
          <Button
            label="Firmar el contrato"
            fullWidth
            size="lg"
            loading={submitting}
            disabled={!why.trim() || !focus}
            onClick={() => focus && onSubmit({ focus, why: why.trim(), durationDays, commitments: picked })}
          />
        </div>
      }
    >
      <TextAreaField
        rows={4}
        placeholder="Porque llevo dos años diciendo que voy a empezar el lunes."
        value={why}
        onChange={(e) => setWhy(e.target.value)}
      />
    </StepFrame>
  );
}
