"use client";

import { Droplet, Meh, Smile, Frown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useAddWater, useMealCheck, useSetMealCheck, useWaterLog } from "../hooks";
import type { MealCheckStatus } from "@/types/models";

const WATER_GOAL_KEY = "veltra-water-goal";
const DEFAULT_GOAL = 8;

function getWaterGoal(): number {
  try {
    const raw = localStorage.getItem(WATER_GOAL_KEY);
    return raw ? Number(raw) : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

const MEAL_CHECK_OPTIONS: { status: MealCheckStatus; label: string; icon: typeof Smile }[] = [
  { status: "good", label: "Sí", icon: Smile },
  { status: "ok", label: "Más o menos", icon: Meh },
  { status: "bad", label: "No", icon: Frown },
];

export function WaterMealCheckCard({ date }: { date: string }) {
  const { data: water } = useWaterLog(date);
  const addWater = useAddWater();
  const { data: mealCheck } = useMealCheck(date);
  const setMealCheck = useSetMealCheck();
  const [goal, setGoal] = useState(DEFAULT_GOAL);

  useEffect(() => setGoal(getWaterGoal()), []);

  const count = water?.count ?? 0;

  return (
    <div className="bg-surface-raised border border-line-subtle rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-info-bg flex items-center justify-center shrink-0">
            <Droplet size={16} className="text-info" />
          </div>
          <div>
            <p className="text-ink text-sm font-semibold">Agua</p>
            <p className="text-ink-faint text-xs">
              {count} / {goal} vasos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => addWater.mutate({ date, delta: -1 })}
            disabled={count === 0 || addWater.isPending}
            className="w-8 h-8 rounded-full bg-surface border border-line-subtle text-ink-dim flex items-center justify-center disabled:opacity-40"
            aria-label="Quitar un vaso"
          >
            −
          </button>
          <button
            onClick={() => addWater.mutate({ date, delta: 1 })}
            disabled={addWater.isPending}
            className="w-8 h-8 rounded-full bg-info text-bg-deep font-bold flex items-center justify-center disabled:opacity-60"
            aria-label="Añadir un vaso"
          >
            +1
          </button>
        </div>
      </div>

      <div>
        <p className="text-ink-faint text-xs font-medium mb-2">¿Comiste bien hoy?</p>
        <div className="flex gap-2">
          {MEAL_CHECK_OPTIONS.map(({ status, label, icon: Icon }) => (
            <button
              key={status}
              onClick={() => setMealCheck.mutate({ date, status })}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border",
                mealCheck?.status === status ? "bg-progress-bg border-progress/40 text-progress" : "bg-surface border-line-subtle text-ink-dim"
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
