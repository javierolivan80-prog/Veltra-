import { create } from "zustand";
import type { Exercise } from "@/src/types/models";

interface ExercisePickerState {
  resolver: ((exercise: Exercise | null) => void) | null;
  setResolver: (fn: (exercise: Exercise | null) => void) => void;
  resolve: (exercise: Exercise | null) => void;
}

/** Simple JS-module resolver so `router.push('/exercise/picker')` can behave like an awaitable modal. */
export const useExercisePickerStore = create<ExercisePickerState>((set, get) => ({
  resolver: null,
  setResolver: (fn) => set({ resolver: fn }),
  resolve: (exercise) => {
    get().resolver?.(exercise);
    set({ resolver: null });
  },
}));
