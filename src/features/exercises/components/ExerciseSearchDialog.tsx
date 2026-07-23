"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "@/design-system/components/Dialog";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useExercises } from "@/features/exercises/hooks";
import type { Exercise } from "@/types/models";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

export function ExerciseSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const { data: exercises = [] } = useExercises();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase();
    const list = norm ? exercises.filter((e) => e.name.toLowerCase().includes(norm)) : exercises;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query]);

  const select = (exercise: Exercise) => {
    onSelect(exercise);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Elegir ejercicio">
      <div className="flex items-center bg-surface border border-line-subtle rounded-2xl px-4 mb-4">
        <Search size={16} className="text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ejercicio…"
          autoFocus
          className="flex-1 bg-transparent text-ink text-base font-medium py-3 ml-2.5 outline-none placeholder:text-ink-faint"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin resultados" description="No hay ejercicios que coincidan con tu búsqueda." />
      ) : (
        <div>
          {filtered.map((item) => (
            <button key={item.id} onClick={() => select(item)} className="flex flex-col w-full text-left py-3.5 border-b border-line-subtle">
              <span className="text-ink text-base font-semibold">{item.name}</span>
              <span className="text-ink-faint text-xs mt-0.5">{item.muscleGroups.map((m) => MUSCLE_LABEL[m] ?? m).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
