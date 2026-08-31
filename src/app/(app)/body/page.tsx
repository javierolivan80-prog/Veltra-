"use client";

import { Dumbbell, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { ModuleCard } from "@/design-system/components/ModuleCard";
import { useDailyNutrition } from "@/features/food/hooks";
import { useProfile } from "@/features/profile/hooks";
import { useSleepLogByDate } from "@/features/sleep/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useCurrentStreak } from "@/features/workouts/hooks";
import { todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";

export default function BodyPage() {
  const today = todayKey();
  const { data: streak = 0 } = useCurrentStreak();
  const { data: lastNight } = useSleepLogByDate(today);
  const { data: nutrition } = useDailyNutrition(today);
  const { data: profile } = useProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Ejercicio · Sueño · Nutrición · Peso</p>
        <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">Cuerpo</h1>
      </div>

      <div className="flex flex-col gap-2.5">
        <ModuleCard
          href="/routines"
          icon={Dumbbell}
          name="Ejercicio"
          quickStat={streak > 0 ? `Racha de ${streak} días` : "Empieza tu racha"}
          colorClass="text-info"
          bgClass="bg-info-bg"
        />
        <ModuleCard
          href="/sleep"
          icon={Moon}
          name="Sueño"
          quickStat={lastNight ? `${formatHoursMinutes(sleptMinutes(lastNight))} anoche` : "Sin registrar"}
          colorClass="text-sleep"
          bgClass="bg-sleep-bg"
        />
        <ModuleCard
          href="/food"
          icon={UtensilsCrossed}
          name="Nutrición"
          quickStat={nutrition && nutrition.mealCount > 0 ? `${Math.round(nutrition.calories)} kcal hoy` : "Sin registrar hoy"}
          colorClass="text-info"
          bgClass="bg-info-bg"
        />
        <ModuleCard
          href="/weight"
          icon={Scale}
          name="Peso"
          quickStat={profile?.bodyweightKg ? `${profile.bodyweightKg} kg` : "Sin registrar"}
          colorClass="text-info"
          bgClass="bg-info-bg"
        />
      </div>
    </div>
  );
}
