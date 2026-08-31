"use client";

import { ShieldAlert, Smartphone } from "lucide-react";
import { ModuleCard } from "@/design-system/components/ModuleCard";
import { useAddictions } from "@/features/addictions/hooks";
import { useScreenTimeByDate } from "@/features/screenTime/hooks";
import { todayKey } from "@/lib/date";

export default function RecoveryPage() {
  const { data: addictions = [] } = useAddictions();
  const { data: todayScreenTime } = useScreenTimeByDate(todayKey());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-ink-dim text-sm">Categoría</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Recuperación</h1>
      </div>

      <div className="flex flex-col gap-2.5">
        <ModuleCard
          href="/addictions"
          icon={ShieldAlert}
          name="Adicciones"
          quickStat={addictions.length > 0 ? `${addictions.length} en seguimiento` : "Sin seguimiento"}
          colorClass="text-addiction"
          bgClass="bg-addiction-bg"
        />
        <ModuleCard
          href="/screen-time"
          icon={Smartphone}
          name="Screen Time"
          quickStat={todayScreenTime ? `${todayScreenTime.hours}h hoy` : "Sin registrar hoy"}
          colorClass="text-addiction"
          bgClass="bg-addiction-bg"
        />
      </div>
    </div>
  );
}
