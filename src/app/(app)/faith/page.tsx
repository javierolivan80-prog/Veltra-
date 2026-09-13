"use client";

import { Check, Church, CircleDotDashed, Cross, ExternalLink, HandHeart, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { useDailyGospel, useFaithCheckInByDate, useUpsertFaithCheckIn } from "@/features/faith/hooks";
import { examenPrompt } from "@/features/faith/prompts";
import { cn } from "@/lib/cn";
import { todayFullLabel, todayKey } from "@/lib/date";
import type { FaithCheckIn } from "@/types/models";

type ToggleKey = "mass" | "rosary" | "prayer";

const CHECK_ITEMS: { key: ToggleKey; label: string; icon: LucideIcon }[] = [
  { key: "mass", label: "Misa", icon: Church },
  { key: "rosary", label: "Rosario", icon: CircleDotDashed },
  { key: "prayer", label: "Oración personal", icon: HandHeart },
];

export default function FaithPage() {
  const today = todayKey();
  const { data: checkIn } = useFaithCheckInByDate(today);
  const upsert = useUpsertFaithCheckIn();
  const { data: gospel, isPending: gospelPending } = useDailyGospel();

  // null = el usuario no ha tocado el campo todavía en esta visita — se
  // muestra lo que ya hubiera guardado. En cuanto escribe algo, sus propios
  // cambios mandan hasta que los guarda, sin pelearse con un efecto que
  // intente re-sincronizar por detrás.
  const [examenEdit, setExamenEdit] = useState<string | null>(null);
  const examen = examenEdit ?? checkIn?.examen ?? "";

  const toggle = (key: ToggleKey) => {
    upsert.mutate({ date: today, patch: { [key]: !checkIn?.[key] } as Partial<FaithCheckIn> });
  };

  const saveExamen = () => {
    if (examenEdit === null || examenEdit === (checkIn?.examen ?? "")) return;
    upsert.mutate({ date: today, patch: { examen: examenEdit } });
  };

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/dashboard" label="Hoy" />
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
          <Cross size={20} className="text-progress" />
        </span>
        <div>
          <h1 className="text-ink text-2xl font-display">Fe</h1>
          <p className="text-ink-dim text-sm mt-0.5 capitalize">{todayFullLabel()}</p>
        </div>
      </div>

      <Card raised>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Evangelio de hoy</p>
        {gospelPending ? (
          <p className="text-ink-faint text-sm mt-2.5">Cargando…</p>
        ) : gospel?.gospelText ? (
          <>
            <p className="text-ink text-base font-display font-semibold mt-2.5">{gospel.title}</p>
            {gospel.citation ? <p className="text-progress text-xs font-semibold mt-1">{gospel.citation}</p> : null}
            <p className="text-ink-dim text-sm mt-2.5 leading-6 whitespace-pre-line">{gospel.gospelText}</p>
            {gospel.commentary ? (
              <div className="mt-4 pt-4 border-t border-line-subtle">
                <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Comentario</p>
                <p className="text-ink-dim text-sm mt-2.5 leading-6 whitespace-pre-line">{gospel.commentary}</p>
                {gospel.commentaryAuthor ? <p className="text-ink-faint text-xs mt-2.5">— {gospel.commentaryAuthor}</p> : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-dim text-sm mt-2.5 leading-6">No se ha podido cargar aquí dentro — puedes leerlo en la fuente.</p>
        )}
        <a
          href={gospel?.sourceUrl ?? "https://evangeli.net"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-ink-faint text-xs font-semibold mt-4"
        >
          Fuente: evangeli.net
          <ExternalLink size={11} />
        </a>
      </Card>

      <div className="flex flex-col gap-2.5">
        {CHECK_ITEMS.map((item) => {
          const done = !!checkIn?.[item.key];
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className="flex items-center gap-3 border border-line-subtle rounded-2xl bg-surface px-4 py-3.5 text-left"
            >
              <Icon size={18} className={cn("shrink-0", done ? "text-progress" : "text-ink-faint")} />
              <p className="flex-1 text-ink text-sm font-semibold">{item.label}</p>
              <span
                className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center shrink-0",
                  done ? "bg-progress border-progress" : "border-line"
                )}
              >
                {done ? <Check size={13} className="text-bg-deep" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <SectionHeader title="Examen de conciencia" subtitle="Privado — nadie más lo lee" />
        <Card raised>
          <textarea
            value={examen}
            onChange={(e) => setExamenEdit(e.target.value)}
            onBlur={saveExamen}
            placeholder={examenPrompt(today)}
            rows={5}
            className="w-full bg-transparent text-ink text-sm leading-6 resize-none outline-none placeholder:text-ink-faint"
          />
        </Card>
      </div>
    </div>
  );
}
