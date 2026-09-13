"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "@/design-system/components/Dialog";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useExercises } from "@/features/exercises/hooks";
import { useRoutines } from "@/features/routines/hooks";
import type { Exercise, MuscleGroup } from "@/types/models";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

// Mismo orden que MuscleGroup en types/models.ts, para que los grupos
// salgan siempre en el mismo orden en vez de en el orden en que aparecen
// por primera vez en las rutinas.
const MUSCLE_ORDER: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "quads", "hamstrings", "glutes", "calves", "abs", "traps", "cardio", "full_body",
];

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
  const { data: routines = [] } = useRoutines();
  const [query, setQuery] = useState("");

  // Solo los ejercicios que el usuario ya tiene añadidos a alguna rutina —
  // no el catálogo entero. El catálogo completo sigue disponible al crear
  // o editar una rutina; aquí solo tiene sentido lo que ya usa.
  const routineExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const routine of routines) {
      for (const re of routine.exercises) ids.add(re.exerciseId);
    }
    return ids;
  }, [routines]);

  const inRoutines = useMemo(() => exercises.filter((e) => routineExerciseIds.has(e.id)), [exercises, routineExerciseIds]);

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase();
    return norm ? inRoutines.filter((e) => e.name.toLowerCase().includes(norm)) : inRoutines;
  }, [inRoutines, query]);

  // Agrupado por área muscular (el primer grupo de cada ejercicio) — un
  // ejercicio con varios grupos musculares solo aparece en el primero,
  // para no duplicarlo en la lista.
  const grouped = useMemo(() => {
    const byGroup = new Map<MuscleGroup, Exercise[]>();
    for (const ex of filtered) {
      const group = ex.muscleGroups[0];
      if (!group) continue;
      const arr = byGroup.get(group);
      if (arr) arr.push(ex);
      else byGroup.set(group, [ex]);
    }
    for (const arr of byGroup.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return MUSCLE_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [filtered]);

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

      {inRoutines.length === 0 ? (
        <EmptyState title="Sin ejercicios en tus rutinas" description="Añade ejercicios a una rutina y aparecerán aquí para analizar su progreso." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin resultados" description="No hay ejercicios de tus rutinas que coincidan con tu búsqueda." />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-1">{MUSCLE_LABEL[group] ?? group}</p>
              <div>
                {items.map((item) => (
                  <button key={item.id} onClick={() => select(item)} className="flex flex-col w-full text-left py-3.5 border-b border-line-subtle">
                    <span className="text-ink text-base font-semibold">{item.name}</span>
                    <span className="text-ink-faint text-xs mt-0.5">{item.muscleGroups.map((m) => MUSCLE_LABEL[m] ?? m).join(" · ")}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
