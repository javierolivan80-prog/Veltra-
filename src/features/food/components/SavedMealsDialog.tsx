"use client";

import { Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { EmptyState } from "@/design-system/components/EmptyState";
import { TextField } from "@/design-system/components/TextField";
import { useCreateSavedMeal, useDeleteSavedMeal, useRegisterSavedMeal, useSavedMeals } from "@/features/food/hooks";

const int = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^0-9.]/g, "")) || 0));

export function SavedMealsDialog({
  open,
  onOpenChange,
  conversationId,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  date: string;
}) {
  const { data: saved = [] } = useSavedMeals();
  const register = useRegisterSavedMeal();
  const create = useCreateSavedMeal();
  const remove = useDeleteSavedMeal();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const resetForm = () => {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setCreating(false);
  };

  const add = async (id: string) => {
    const meal = saved.find((m) => m.id === id);
    if (!meal) return;
    await register.mutateAsync({ saved: meal, conversationId, date });
    onOpenChange(false);
  };

  const saveNew = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      foods: [],
      calories: int(calories),
      protein: int(protein),
      carbs: int(carbs),
      fat: int(fat),
      fiber: 0,
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Mis comidas frecuentes">
      {creating ? (
        <div className="flex flex-col gap-4">
          <p className="text-ink-dim text-sm leading-5">Guarda una comida que repitas a menudo para añadirla luego de un toque.</p>
          <TextField label="Nombre" placeholder="p. ej. 3 huevos revueltos con havarti" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Calorías" inputMode="numeric" suffix="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Proteínas" inputMode="numeric" suffix="g" value={protein} onChange={(e) => setProtein(e.target.value)} />
            <TextField label="Carbos" inputMode="numeric" suffix="g" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            <TextField label="Grasas" inputMode="numeric" suffix="g" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
          <Button label="Guardar comida" onClick={saveNew} disabled={!name.trim()} loading={create.isPending} fullWidth size="lg" />
          <button onClick={resetForm} className="py-2 text-ink-dim text-sm font-semibold">
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {saved.length === 0 ? (
            <EmptyState
              title="Aún no tienes comidas guardadas"
              description="Guarda las que repitas a menudo (tu desayuno, tu batido…) y añádelas al día con un solo toque."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {saved.map((m) => (
                <div key={m.id} className="flex items-center gap-2 bg-surface border border-line-subtle rounded-2xl pl-4 pr-1.5 py-2.5">
                  <button onClick={() => add(m.id)} className="flex-1 min-w-0 text-left" disabled={register.isPending}>
                    <p className="text-ink text-sm font-semibold truncate">{m.name}</p>
                    <p className="text-ink-faint text-[11px] mt-0.5 tabular-nums">
                      {Math.round(m.calories)} kcal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · G {Math.round(m.fat)}
                    </p>
                  </button>
                  <button
                    onClick={() => add(m.id)}
                    aria-label={`Añadir ${m.name}`}
                    disabled={register.isPending}
                    className="w-10 h-10 rounded-xl bg-progress/15 flex items-center justify-center text-progress shrink-0"
                  >
                    <Zap size={16} />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`¿Eliminar "${m.name}" de tus comidas frecuentes?`)) await remove.mutateAsync(m.id);
                    }}
                    aria-label={`Eliminar ${m.name}`}
                    className="w-9 h-9 flex items-center justify-center text-ink-faint shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setCreating(true)}
            className="flex items-center justify-center gap-2 border border-dashed border-line rounded-2xl py-3.5 text-progress font-semibold"
          >
            <Plus size={16} />
            Crear comida frecuente
          </button>
        </div>
      )}
    </Dialog>
  );
}
