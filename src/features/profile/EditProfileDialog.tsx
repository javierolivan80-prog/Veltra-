"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/design-system/components/Dialog";
import { ProfileSetupForm, type ProfileFormValues } from "@/features/onboarding/ProfileSetupForm";
import { profileKeys, useProfile, useUpsertProfile } from "@/features/profile/hooks";
import { addInjury } from "@/features/profile/repo";

function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return "";
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000));
  return String(age);
}

export function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: profile } = useProfile();
  const upsertProfile = useUpsertProfile();
  const qc = useQueryClient();

  if (!profile) return null;

  const initial: Partial<ProfileFormValues> = {
    fullName: profile.fullName,
    sex: profile.sex,
    age: ageFromBirthDate(profile.birthDate),
    heightCm: profile.heightCm ? String(profile.heightCm) : "",
    bodyweightKg: profile.bodyweightKg ? String(profile.bodyweightKg) : "",
    experienceLevel: profile.experienceLevel,
    goal: profile.goal,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    equipmentAvailable: profile.equipmentAvailable,
  };

  const submit = async (values: ProfileFormValues) => {
    const year = new Date().getFullYear() - (parseInt(values.age, 10) || 0);
    await upsertProfile.mutateAsync({
      fullName: values.fullName,
      sex: values.sex,
      birthDate: values.age ? new Date(year, 0, 1).toISOString() : profile.birthDate,
      heightCm: values.heightCm ? Number(values.heightCm) : null,
      bodyweightKg: values.bodyweightKg ? Number(values.bodyweightKg) : null,
      experienceLevel: values.experienceLevel,
      goal: values.goal,
      trainingDaysPerWeek: values.trainingDaysPerWeek,
      equipmentAvailable: values.equipmentAvailable,
    });
    if (values.injuryArea.trim()) {
      await addInjury(values.injuryArea.trim(), values.injuryNote.trim());
      qc.invalidateQueries({ queryKey: profileKeys.injuries });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Editar perfil">
      <ProfileSetupForm initial={initial} submitLabel="Guardar cambios" submitting={upsertProfile.isPending} onSubmit={submit} />
    </Dialog>
  );
}
