"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { AccountStep } from "@/features/onboarding/AccountStep";
import { IntroCarousel } from "@/features/onboarding/IntroCarousel";
import { ProfileSetupForm, type ProfileFormValues } from "@/features/onboarding/ProfileSetupForm";
import { addInjury, upsertProfile } from "@/features/profile/repo";
import { getDb } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/demoData";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Step = "intro" | "choice" | "account" | "profile";

function ageToBirthDate(age: string): string | null {
  const n = parseInt(age, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const year = new Date().getFullYear() - n;
  return new Date(year, 0, 1).toISOString();
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipToProfile = searchParams.get("step") === "profile";

  const [step, setStep] = useState<Step>(skipToProfile ? "profile" : "intro");
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadDemo = async () => {
    setLoadingDemo(true);
    const db = await getDb();
    await seedDemoData(db);
    router.replace("/dashboard");
  };

  const finalizeProfile = async (values: ProfileFormValues) => {
    setSubmitting(true);
    await upsertProfile({
      fullName: values.fullName,
      sex: values.sex,
      birthDate: ageToBirthDate(values.age),
      heightCm: values.heightCm ? Number(values.heightCm) : null,
      bodyweightKg: values.bodyweightKg ? Number(values.bodyweightKg) : null,
      experienceLevel: values.experienceLevel,
      goal: values.goal,
      trainingDaysPerWeek: values.trainingDaysPerWeek,
      equipmentAvailable: values.equipmentAvailable,
    });
    if (values.injuryArea.trim()) {
      await addInjury(values.injuryArea.trim(), values.injuryNote.trim());
    }
    router.replace("/dashboard");
  };

  if (step === "intro") {
    return <IntroCarousel onFinish={() => setStep("choice")} />;
  }

  if (step === "choice") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col gap-4">
          <h1 className="text-ink text-2xl font-display text-center mb-2">¿Cómo quieres empezar?</h1>

          <Card onClick={() => setStep(isSupabaseConfigured ? "account" : "profile")} raised>
            <p className="text-ink text-lg font-display">Configurar mi perfil</p>
            <p className="text-ink-dim text-sm mt-1.5 leading-5">
              Empieza desde cero con tus datos reales. Tu rango de fuerza y tu entrenador IA se calcularán a partir de tus propios entrenamientos.
            </p>
          </Card>

          <Card onClick={loadDemo} raised>
            <p className="text-ink text-lg font-display">Explorar con datos de ejemplo</p>
            <p className="text-ink-dim text-sm mt-1.5 leading-5">
              Carga 10 semanas de historial de ejemplo para ver rutinas, gráficas, rangos y el entrenador IA en acción al instante.
            </p>
          </Card>

          {loadingDemo ? (
            <div className="flex justify-center pt-2">
              <Button label="Cargando datos de ejemplo…" loading variant="ghost" />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (step === "account") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <AccountStep fullName="" onDone={() => setStep("profile")} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <ProfileSetupForm onSubmit={finalizeProfile} submitting={submitting} />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  );
}
