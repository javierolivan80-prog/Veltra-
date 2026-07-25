"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextField } from "@/design-system/components/TextField";
import { useDeleteFoodMeal, useUpdateFoodMeal } from "@/features/food/hooks";
import type { FoodMeal } from "@/types/models";

const int = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^0-9.]/g, "")) || 0));

export function MealEditDialog({
  meal,
  conversationId,
  date,
  open,
  onOpenChange,
}: {
  meal: FoodMeal | null;
  conversationId: string;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateFoodMeal();
  const remove = useDeleteFoodMeal();

  const [note, setNote] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => {
    if (open && meal) {
      setNote(meal.note);
      setCalories(String(Math.round(meal.calories)));
      setProtein(String(Math.round(meal.protein)));
      setCarbs(String(Math.round(meal.carbs)));
      setFat(String(Math.round(meal.fat)));
    }
  }, [open, meal]);

  if (!meal) return null;

  const save = async () => {
    await update.mutateAsync({
      id: meal.id,
      conversationId,
      date,
      patch: { note: note.trim() || "Comida", calories: int(calories), protein: int(protein), carbs: int(carbs), fat: int(fat) },
    });
    onOpenChange(false);
  };

  const del = async () => {
    if (!confirm("¿Eliminar esta comida del día?")) return;
    await remove.mutateAsync({ id: meal.id, conversationId, date });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Corregir comida">
      <div className="flex flex-col gap-4">
        <p className="text-ink-dim text-sm leading-5">Ajusta los valores si la estimación no fue exacta. El total del día se recalcula al guardar.</p>

        <TextField label="Nombre" value={note} onChange={(e) => setNote(e.target.value)} />
        <TextField label="Calorías" inputMode="numeric" suffix="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Proteínas" inputMode="numeric" suffix="g" value={protein} onChange={(e) => setProtein(e.target.value)} />
          <TextField label="Carbos" inputMode="numeric" suffix="g" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          <TextField label="Grasas" inputMode="numeric" suffix="g" value={fat} onChange={(e) => setFat(e.target.value)} />
        </div>

        {meal.foods.length > 0 ? (
          <div>
            <p className="text-ink-faint text-xs font-semibold uppercase tracking-wider mb-2">Alimentos detectados</p>
            <div className="flex flex-col gap-1">
              {meal.foods.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink-dim truncate pr-2">{f.name}</span>
                  <span className="text-ink-faint shrink-0">{f.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Button label="Guardar cambios" onClick={save} loading={update.isPending} fullWidth size="lg" />
        <button onClick={del} className="flex items-center justify-center gap-2 py-3 text-danger text-sm font-semibold">
          <Trash2 size={15} />
          Eliminar comida
        </button>
      </div>
    </Dialog>
  );
}
