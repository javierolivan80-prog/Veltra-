"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextField } from "@/design-system/components/TextField";
import { useNutritionGoals, useUpsertNutritionGoals } from "@/features/food/hooks";

const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^0-9]/g, "")) || 0));

export function NutritionGoalsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: goals } = useNutritionGoals();
  const upsert = useUpsertNutritionGoals();

  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => {
    if (open && goals) {
      setCalories(String(goals.calories));
      setProtein(String(goals.protein));
      setCarbs(String(goals.carbs));
      setFat(String(goals.fat));
    }
  }, [open, goals]);

  const save = async () => {
    await upsert.mutateAsync({ calories: num(calories), protein: num(protein), carbs: num(carbs), fat: num(fat) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Objetivos diarios">
      <div className="flex flex-col gap-4">
        <p className="text-ink-dim text-sm leading-5">Define tus objetivos de nutrición. El progreso de cada día se compara con estos valores.</p>
        <TextField label="Calorías" inputMode="numeric" suffix="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Proteínas" inputMode="numeric" suffix="g" value={protein} onChange={(e) => setProtein(e.target.value)} />
          <TextField label="Carbos" inputMode="numeric" suffix="g" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          <TextField label="Grasas" inputMode="numeric" suffix="g" value={fat} onChange={(e) => setFat(e.target.value)} />
        </div>
        <Button label="Guardar objetivos" onClick={save} loading={upsert.isPending} fullWidth size="lg" />
      </div>
    </Dialog>
  );
}
