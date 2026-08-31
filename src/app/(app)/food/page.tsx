"use client";

import { BookMarked, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { DailyProgressCard } from "@/features/food/components/DailyProgressCard";
import { FoodChat } from "@/features/food/components/FoodChat";
import { NutritionGoalsDialog } from "@/features/food/components/NutritionGoalsDialog";
import { SavedMealsDialog } from "@/features/food/components/SavedMealsDialog";
import { WaterMealCheckCard } from "@/features/food/components/WaterMealCheckCard";
import { todayKey } from "@/features/food/dates";
import { useDailyNutrition, useNutritionGoals, useTodayConversation } from "@/features/food/hooks";

const EMPTY_TOTALS = { date: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealCount: 0 };
const DEFAULT_GOALS = { calories: 2400, protein: 180, carbs: 250, fat: 70, updatedAt: "" };

export default function FoodTodayPage() {
  const date = todayKey();
  const { data: conversation } = useTodayConversation();
  const { data: totals = EMPTY_TOTALS } = useDailyNutrition(date);
  const { data: goals = DEFAULT_GOALS } = useNutritionGoals();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-3.5rem)]">
      <CategoryBackLink href="/body" label="Cuerpo" />
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-ink text-2xl font-display">Veltra Food</h1>
          <p className="text-ink-dim text-sm mt-0.5">Hoy · registra lo que comes al instante</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSavedOpen(true)}
            aria-label="Mis comidas frecuentes"
            className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim"
          >
            <BookMarked size={18} />
          </button>
          <Link href="/food/history" className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim">
            <CalendarDays size={18} />
          </Link>
        </div>
      </div>

      <div className="shrink-0 mb-4 flex flex-col gap-3">
        <WaterMealCheckCard date={date} />
        <DailyProgressCard totals={{ ...totals, date }} goals={goals} onEditGoals={() => setGoalsOpen(true)} />
      </div>

      {conversation ? (
        <div className="flex-1 min-h-0">
          <FoodChat conversationId={conversation.id} date={date} />
        </div>
      ) : null}

      <NutritionGoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} />
      {conversation ? <SavedMealsDialog open={savedOpen} onOpenChange={setSavedOpen} conversationId={conversation.id} date={date} /> : null}
    </div>
  );
}
