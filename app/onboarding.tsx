import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Screen } from "@/src/design-system/components/Screen";
import { Button } from "@/src/design-system/components/Button";
import { Card } from "@/src/design-system/components/Card";
import { IntroCarousel } from "@/src/features/onboarding/IntroCarousel";
import { ProfileSetupForm, type ProfileFormValues } from "@/src/features/onboarding/ProfileSetupForm";
import { AccountStep } from "@/src/features/onboarding/AccountStep";
import { upsertProfile } from "@/src/features/profile/repo";
import { seedDemoData } from "@/src/lib/db/demoData";
import { getDb } from "@/src/lib/db/client";
import { useAuthStore } from "@/src/state/auth.store";

type Step = "intro" | "choice" | "profile" | "account";

function ageToBirthDate(age: string): string | null {
  const n = parseInt(age, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const year = new Date().getFullYear() - n;
  return new Date(year, 0, 1).toISOString();
}

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>("intro");
  const [profileValues, setProfileValues] = useState<ProfileFormValues | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const loadDemo = async () => {
    setLoadingDemo(true);
    const db = await getDb();
    await seedDemoData(db);
    setLoadingDemo(false);
    router.replace("/(tabs)");
  };

  const finalizeProfile = async (fullName: string) => {
    if (!profileValues) return;
    const email = useAuthStore.getState().user?.email ?? "";
    await upsertProfile({
      fullName,
      email,
      sex: profileValues.sex,
      birthDate: ageToBirthDate(profileValues.age),
      heightCm: profileValues.heightCm ? Number(profileValues.heightCm) : null,
      bodyweightKg: profileValues.bodyweightKg ? Number(profileValues.bodyweightKg) : null,
      experienceLevel: profileValues.experienceLevel,
      goal: profileValues.goal,
      equipmentAvailable: profileValues.equipmentAvailable,
    });
    router.replace("/(tabs)");
  };

  if (step === "intro") {
    return <IntroCarousel onFinish={() => setStep("choice")} />;
  }

  if (step === "choice") {
    return (
      <Screen scroll={false}>
        <View className="flex-1 justify-center gap-4">
          <Text className="text-ink text-2xl font-display text-center mb-2">¿Cómo quieres empezar?</Text>

          <Card onPress={() => setStep("profile")} raised>
            <Text className="text-ink text-lg font-display">Configurar mi perfil</Text>
            <Text className="text-ink-dim text-sm font-body mt-1.5 leading-5">
              Empieza desde cero con tus datos reales. Tu rango de fuerza y tu entrenador IA se calcularán a partir de tus propios entrenamientos.
            </Text>
          </Card>

          <Card onPress={loadDemo} raised>
            <Text className="text-ink text-lg font-display">Explorar con datos de ejemplo</Text>
            <Text className="text-ink-dim text-sm font-body mt-1.5 leading-5">
              Carga 10 semanas de historial de ejemplo para ver rutinas, gráficas, rangos y el entrenador IA en acción al instante.
            </Text>
          </Card>

          {loadingDemo ? (
            <View className="items-center pt-2">
              <Button label="Cargando datos de ejemplo…" loading fullWidth={false} variant="ghost" />
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  if (step === "profile") {
    return (
      <Screen scroll={false} contentClassName="pt-4">
        <ProfileSetupForm
          onSubmit={(values) => {
            setProfileValues(values);
            setStep("account");
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentClassName="pt-4">
      <AccountStep fullName={profileValues?.fullName ?? ""} onDone={() => finalizeProfile(profileValues?.fullName ?? "")} />
    </Screen>
  );
}
