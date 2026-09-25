import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cancelRestAlert, scheduleRestAlert } from "@/features/workouts/restAlerts";
import { generateId } from "@/lib/id";

interface RestTimerState {
  /** Which session this rest belongs to, so a stale timer never bleeds into a different workout. */
  sessionId: string | null;
  endsAt: number | null;
  durationSeconds: number;
  /** Ties this specific rest to its scheduled push row (rest_alerts) so clearRest can cancel exactly this one. */
  restId: string | null;
}

interface WorkoutSessionState {
  restTimer: RestTimerState;
  startRest: (sessionId: string, seconds: number) => void;
  clearRest: () => void;
}

const EMPTY_REST_TIMER: RestTimerState = { sessionId: null, endsAt: null, durationSeconds: 0, restId: null };

// Persisted (not just in-memory) so the rest countdown survives the web app
// being closed and reopened mid-rest: endsAt is an absolute timestamp, so the
// remaining time is always recomputed from the real clock instead of drifting
// or resetting to zero.
export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      restTimer: EMPTY_REST_TIMER,
      startRest: (sessionId, seconds) => {
        const previousRestId = get().restTimer.restId;
        if (previousRestId) void cancelRestAlert(previousRestId);
        const restId = generateId();
        const endsAt = Date.now() + seconds * 1000;
        set({ restTimer: { sessionId, endsAt, durationSeconds: seconds, restId } });
        void scheduleRestAlert(restId, endsAt);
      },
      clearRest: () => {
        const previousRestId = get().restTimer.restId;
        if (previousRestId) void cancelRestAlert(previousRestId);
        set({ restTimer: EMPTY_REST_TIMER });
      },
    }),
    { name: "veltra-workout-session" }
  )
);
