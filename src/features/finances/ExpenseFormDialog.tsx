"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextField } from "@/design-system/components/TextField";
import { todayKey } from "@/lib/date";
import { useAddExpense } from "./hooks";

export function ExpenseFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [isEssential, setIsEssential] = useState(true);
  const addExpense = useAddExpense();

  const save = async () => {
    const value = Number(amount);
    if (!(value > 0)) return;
    await addExpense.mutateAsync({ amount: value, category: category.trim() || null, note: note.trim() || null, date: todayKey(), isEssential });
    setAmount("");
    setCategory("");
    setNote("");
    setIsEssential(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Registrar gasto">
      <div className="flex flex-col gap-4">
        <TextField label="Cantidad" placeholder="25.50" inputMode="decimal" suffix="€" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <TextField label="Categoría (opcional)" placeholder="p. ej. Comida, Ocio…" value={category} onChange={(e) => setCategory(e.target.value)} />
        <TextField label="Nota (opcional)" placeholder="¿En qué?" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          onClick={() => setIsEssential((v) => !v)}
          className="flex items-center justify-between bg-surface border border-line-subtle rounded-2xl px-4 py-3.5"
        >
          <span className="text-ink text-sm font-medium">Gasto esencial</span>
          <span className={`w-11 h-6 rounded-full relative transition-colors ${isEssential ? "bg-progress" : "bg-line"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isEssential ? "translate-x-5" : "translate-x-0.5"}`} />
          </span>
        </button>
        <Button label="Guardar" onClick={save} loading={addExpense.isPending} fullWidth disabled={!amount} />
      </div>
    </Dialog>
  );
}
