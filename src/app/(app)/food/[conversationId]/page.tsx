"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DailyProgressCard } from "@/features/food/components/DailyProgressCard";
import { FoodChat } from "@/features/food/components/FoodChat";
import { NutritionGoalsDialog } from "@/features/food/components/NutritionGoalsDialog";
import { dayLabel } from "@/features/food/dates";
import { useDailyNutrition, useFoodConversation, useNutritionGoals } from "@/features/food/hooks";

const EMPTY_TOTALS = { date: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealCount: 0 };
const DEFAULT_GOALS = { calories: 2400, protein: 180, carbs: 250, fat: 70, updatedAt: "" };

export default function FoodDayPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { data: conversation } = useFoodConversation(conversationId ?? null);
  const date = conversation?.date ?? null;
  const { data: totals = EMPTY_TOTALS } = useDailyNutrition(date);
  const { data: goals = DEFAULT_GOALS } = useNutritionGoals();
  const [goalsOpen, setGoalsOpen] = useState(false);

  if (!conversationId || !conversation || !date) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/food/history" className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-ink text-2xl font-display capitalize">{dayLabel(date)}</h1>
          <p className="text-ink-dim text-sm mt-0.5">{date}</p>
        </div>
      </div>

      <div className="shrink-0 mb-4">
        <DailyProgressCard totals={{ ...totals, date }} goals={goals} onEditGoals={() => setGoalsOpen(true)} />
      </div>

      <div className="flex-1 min-h-0">
        <FoodChat conversationId={conversation.id} date={date} />
      </div>

      <NutritionGoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} />
    </div>
  );
}
