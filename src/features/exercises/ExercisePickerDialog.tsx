"use client";

import { Cpu, PlusCircle, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "@/design-system/components/Dialog";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useExercises, useRecommendedExercises, useToggleFavorite } from "@/features/exercises/hooks";
import type { Exercise } from "@/types/models";
import { ExerciseFormDialog } from "./ExerciseFormDialog";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

export function ExercisePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const { data: exercises = [] } = useExercises();
  const { data: recommended = [] } = useRecommendedExercises(6);
  const toggleFavorite = useToggleFavorite();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase();
    const list = norm ? exercises.filter((e) => e.name.toLowerCase().includes(norm)) : exercises;
    return [...list].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name));
  }, [exercises, query]);

  const select = (exercise: Exercise) => {
    onSelect(exercise);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title="Elegir ejercicio">
        <div className="flex items-center bg-surface border border-line-subtle rounded-2xl px-4 mb-4">
          <Search size={16} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio…"
            className="flex-1 bg-transparent text-ink text-base font-medium py-3 ml-2.5 outline-none placeholder:text-ink-faint"
          />
        </div>

        {!query && recommended.length > 0 ? (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Cpu size={13} className="text-ai" />
              <span className="text-ai text-xs font-bold uppercase tracking-wider">Recomendado por tu IA</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-fade-x pb-1 pr-2">
              {recommended.map((rec) => (
                <button
                  key={rec.exercise.id}
                  onClick={() => select(rec.exercise)}
                  className="w-40 shrink-0 text-left bg-ai-bg border border-ai/25 rounded-2xl p-3.5"
                >
                  <p className="text-ink text-sm font-semibold truncate">{rec.exercise.name}</p>
                  <p className="text-ink-dim text-[11px] mt-1 leading-4 line-clamp-2">{rec.reason}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Prueba otra búsqueda o crea un ejercicio nuevo." />
        ) : (
          <div>
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center py-3.5 border-b border-line-subtle">
                <button onClick={() => select(item)} className="flex-1 text-left min-w-0">
                  <p className="text-ink text-base font-semibold truncate">{item.name}</p>
                  <p className="text-ink-faint text-xs mt-0.5 truncate">{item.muscleGroups.map((m) => MUSCLE_LABEL[m] ?? m).join(" · ")}</p>
                </button>
                <button onClick={() => toggleFavorite.mutate(item.id)} className="p-2 shrink-0">
                  <Star size={18} className={item.isFavorite ? "text-record fill-record" : "text-line"} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 py-4 text-progress font-semibold">
          <PlusCircle size={18} />
          Crear ejercicio nuevo
        </button>
      </Dialog>

      <ExerciseFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(exercise) => select(exercise)} />
    </>
  );
}
