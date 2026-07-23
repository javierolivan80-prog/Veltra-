"use client";

import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import type { DailyNutrition, NutritionGoals } from "@/types/models";
import { MacroBar } from "./MacroBar";

const CAL_COLOR = "#2ce6a0";
const PROTEIN_COLOR = "#4da3ff";
const CARBS_COLOR = "#ffc94d";
const FAT_COLOR = "#a374ff";

export function DailyProgressCard({
  totals,
  goals,
  onEditGoals,
}: {
  totals: DailyNutrition;
  goals: NutritionGoals;
  onEditGoals?: () => void;
}) {
  const calRatio = goals.calories > 0 ? Math.min(1, totals.calories / goals.calories) : 0;
  const remaining = Math.round(goals.calories - totals.calories);

  return (
    <div className="rounded-3xl border border-line-subtle bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <ProgressRing progress={calRatio} size={72} strokeWidth={7} color={CAL_COLOR}>
            <span className="text-ink text-sm font-display tabular-nums">{Math.round(calRatio * 100)}%</span>
          </ProgressRing>
          <div>
            <motion.p
              key={Math.round(totals.calories)}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-ink text-3xl font-display tabular-nums leading-none"
            >
              {Math.round(totals.calories)}
              <span className="text-ink-dim text-base font-medium"> / {Math.round(goals.calories)} kcal</span>
            </motion.p>
            <p className="text-ink-dim text-xs mt-1.5">
              {remaining > 0
                ? `Te faltan ${remaining} kcal`
                : remaining === 0
                  ? "Objetivo de calorías alcanzado ✓"
                  : `${Math.abs(remaining)} kcal por encima`}
            </p>
          </div>
        </div>
        {onEditGoals ? (
          <button onClick={onEditGoals} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-ink-dim shrink-0">
            <Settings2 size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <MacroBar label="Proteínas" current={totals.protein} goal={goals.protein} unit="g" color={PROTEIN_COLOR} />
        <MacroBar label="Carbohidratos" current={totals.carbs} goal={goals.carbs} unit="g" color={CARBS_COLOR} />
        <MacroBar label="Grasas" current={totals.fat} goal={goals.fat} unit="g" color={FAT_COLOR} />
      </div>

      {totals.fiber > 0 ? <p className="text-ink-faint text-[11px] mt-4">Fibra: {Math.round(totals.fiber)} g · {totals.mealCount} comida{totals.mealCount !== 1 ? "s" : ""} hoy</p> : null}
    </div>
  );
}
