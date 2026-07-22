import { create } from "zustand";

interface RestTimerState {
  endsAt: number | null;
  durationSeconds: number;
}

interface WorkoutSessionState {
  activeSessionId: string | null;
  currentExerciseId: string | null;
  restTimer: RestTimerState;
  setActiveSession: (id: string | null) => void;
  setCurrentExercise: (id: string | null) => void;
  startRest: (seconds: number) => void;
  clearRest: () => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionState>((set) => ({
  activeSessionId: null,
  currentExerciseId: null,
  restTimer: { endsAt: null, durationSeconds: 0 },
  setActiveSession: (id) => set({ activeSessionId: id }),
  setCurrentExercise: (id) => set({ currentExerciseId: id }),
  startRest: (seconds) => set({ restTimer: { endsAt: Date.now() + seconds * 1000, durationSeconds: seconds } }),
  clearRest: () => set({ restTimer: { endsAt: null, durationSeconds: 0 } }),
}));
