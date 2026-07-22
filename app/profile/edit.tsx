import { router } from "expo-router";
import { Screen } from "@/src/design-system/components/Screen";
import { ModalHeader } from "@/src/design-system/components/ModalHeader";
import { ProfileSetupForm } from "@/src/features/onboarding/ProfileSetupForm";
import { useProfile, useUpsertProfile } from "@/src/features/profile/hooks";

function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return "";
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000));
  return String(age);
}

export default function EditProfileScreen() {
  const { data: profile } = useProfile();
  const upsertProfile = useUpsertProfile();

  if (!profile) return null;

  return (
    <Screen scroll={false} contentClassName="pt-4">
      <ModalHeader title="Editar perfil" onClose={() => router.back()} />
      <ProfileSetupForm
        submitLabel="Guardar cambios"
        submitting={upsertProfile.isPending}
        initial={{
          fullName: profile.fullName,
          sex: profile.sex,
          age: ageFromBirthDate(profile.birthDate),
          heightCm: profile.heightCm ? String(profile.heightCm) : "",
          bodyweightKg: profile.bodyweightKg ? String(profile.bodyweightKg) : "",
          experienceLevel: profile.experienceLevel,
          goal: profile.goal,
          equipmentAvailable: profile.equipmentAvailable,
        }}
        onSubmit={async (values) => {
          const year = new Date().getFullYear() - (parseInt(values.age, 10) || 0);
          await upsertProfile.mutateAsync({
            fullName: values.fullName,
            email: profile.email,
            sex: values.sex,
            birthDate: values.age ? new Date(year, 0, 1).toISOString() : profile.birthDate,
            heightCm: values.heightCm ? Number(values.heightCm) : null,
            bodyweightKg: values.bodyweightKg ? Number(values.bodyweightKg) : null,
            experienceLevel: values.experienceLevel,
            goal: values.goal,
            equipmentAvailable: values.equipmentAvailable,
          });
          router.back();
        }}
      />
    </Screen>
  );
}
