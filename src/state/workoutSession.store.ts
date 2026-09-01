import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RestTimerState {
  /** Which session this rest belongs to, so a stale timer never bleeds into a different workout. */
  sessionId: string | null;
  endsAt: number | null;
  durationSeconds: number;
}

interface WorkoutSessionState {
  restTimer: RestTimerState;
  startRest: (sessionId: string, seconds: number) => void;
  clearRest: () => void;
}

const EMPTY_REST_TIMER: RestTimerState = { sessionId: null, endsAt: null, durationSeconds: 0 };

// Persisted (not just in-memory) so the rest countdown survives the web app
// being closed and reopened mid-rest: endsAt is an absolute timestamp, so the
// remaining time is always recomputed from the real clock instead of drifting
// or resetting to zero.
export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set) => ({
      restTimer: EMPTY_REST_TIMER,
      startRest: (sessionId, seconds) => set({ restTimer: { sessionId, endsAt: Date.now() + seconds * 1000, durationSeconds: seconds } }),
      clearRest: () => set({ restTimer: EMPTY_REST_TIMER }),
    }),
    { name: "veltra-workout-session" }
  )
);
