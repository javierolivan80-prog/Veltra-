"use client";

import { Dumbbell, Star } from "lucide-react";
import { Dialog } from "@/design-system/components/Dialog";
import { EmptyState } from "@/design-system/components/EmptyState";
import type { Routine } from "@/types/models";

/**
 * Antes, "Empezar entrenamiento" en Hoy arrancaba directo con la rutina que
 * tocaba en rotación (la que lleva más tiempo sin hacerse), sin dejar
 * elegir. La única forma de decidir tú era ir primero a Rutinas — nada
 * obvio desde Hoy. Este selector se abre en su lugar: la sugerida sigue
 * ahí, marcada, pero cualquiera de las otras (o entrenar libre) está a un
 * toque de distancia.
 */
export function RoutinePickerDialog({
  open,
  onOpenChange,
  routines,
  suggestedRoutineId,
  onSelect,
  onSelectFree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routines: Routine[];
  suggestedRoutineId: string | null;
  onSelect: (routine: Routine) => void;
  onSelectFree: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Elegir rutina">
      <div className="flex flex-col gap-2.5">
        <button
          onClick={onSelectFree}
          className="rounded-2xl border border-dashed border-line bg-surface p-4 flex items-center gap-3 text-left hover:border-progress/50 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
            <Dumbbell size={18} className="text-progress" />
          </span>
          <span className="min-w-0">
            <span className="block text-ink text-sm font-semibold">Entrenamiento libre</span>
            <span className="block text-ink-dim text-xs mt-0.5">Sin rutina — elige cada ejercicio sobre la marcha</span>
          </span>
        </button>

        {routines.length === 0 ? (
          <EmptyState title="Sin rutinas" description="Todavía no has creado ninguna rutina — puedes entrenar libre mientras tanto." />
        ) : (
          routines.map((routine) => (
            <button
              key={routine.id}
              onClick={() => onSelect(routine)}
              className="rounded-2xl border border-line-subtle bg-surface-raised p-4 flex items-center justify-between gap-3 text-left hover:border-line transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-ink text-sm font-semibold truncate">{routine.name}</p>
                  {routine.id === suggestedRoutineId ? (
                    <span className="flex items-center gap-0.5 text-progress text-[10px] font-bold uppercase tracking-wide shrink-0">
                      <Star size={10} className="fill-progress" />
                      Sugerida
                    </span>
                  ) : null}
                </div>
                <p className="text-ink-dim text-xs mt-0.5">
                  {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
