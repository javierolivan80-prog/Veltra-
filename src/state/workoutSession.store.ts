import { create } from "zustand";

interface RestTimerState {
  endsAt: number | null;
  durationSeconds: number;
}

interface WorkoutSessionState {
  restTimer: RestTimerState;
  startRest: (seconds: number) => void;
  clearRest: () => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionState>((set) => ({
  restTimer: { endsAt: null, durationSeconds: 0 },
  startRest: (seconds) => set({ restTimer: { endsAt: Date.now() + seconds * 1000, durationSeconds: seconds } }),
  clearRest: () => set({ restTimer: { endsAt: null, durationSeconds: 0 } }),
}));
