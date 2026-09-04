"use client";

import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Card } from "@/design-system/components/Card";
import { useWorkoutSuggestions } from "./hooks";

export function WorkoutSuggestions() {
  const { data: suggestions = [], isLoading, error } = useWorkoutSuggestions(4);

  if (isLoading || error || suggestions.length === 0) return null;

  return (
    <Card>
      <div className="flex items-start gap-3 mb-3">
        <Lightbulb size={18} className="text-progress shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-ink font-semibold text-sm">Entrenamientos sugeridos</p>
          <p className="text-ink-dim text-xs mt-0.5">Basados en lo que no has entrenado últimamente</p>
        </div>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <Link
            key={suggestion.exercise.id}
            href={`/exercises/${suggestion.exercise.id}`}
            className="flex items-center justify-between p-2.5 rounded-lg bg-surface hover:bg-surface-hover transition-colors border border-transparent hover:border-line"
          >
            <div className="min-w-0 flex-1">
              <p className="text-ink text-sm font-medium truncate">{suggestion.exercise.name}</p>
              <p className="text-ink-dim text-xs mt-0.5">
                {suggestion.suggestedSets} × {suggestion.suggestedRepsMin}-{suggestion.suggestedRepsMax} reps
              </p>
            </div>
            {suggestion.lastWeight && (
              <div className="text-right shrink-0 pl-3">
                <p className="text-ink-faint text-xs">{suggestion.lastWeight.toFixed(1)} kg</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </Card>
  );
}
