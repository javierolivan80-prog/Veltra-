import { listPhysiqueCheckins, listPhysiquePhotosForDate } from "@/features/physique/repo";
import { getProfile } from "@/features/profile/repo";
import type { PhysiquePose } from "@/types/models";

export interface PhysiqueContext {
  profileSummary: string;
  previousCheckinsSummary: string;
  posesProvidedSummary: string;
}

const POSE_LABEL: Record<PhysiquePose, string> = {
  baseline: "Foto inicial de referencia",
  back_lats: "Espalda — dorsales, brazos pegados al torso",
  front_double_biceps: "Doble bíceps de frente",
  back_double_biceps: "Doble bíceps de espalda",
  side_triceps: "Tríceps de perfil",
};

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000));
}

/** Contexto para que la IA estime el físico con algo de referencia real, en
 *  vez de a ciegas: perfil (para calibrar el rango por sexo/edad/altura),
 *  check-ins anteriores (para poder hablar de tendencia) y qué poses hay
 *  disponibles esta vez (para ensanchar la estimación si faltan ángulos). */
export async function buildPhysiqueContext(date: string): Promise<PhysiqueContext> {
  const profile = await getProfile();
  const profileSummary = profile
    ? `sexo ${profile.sex}, ${ageFromBirthDate(profile.birthDate) ?? "edad desconocida"}, ${profile.heightCm ?? "?"}cm, ${profile.bodyweightKg ?? "?"}kg, nivel ${profile.experienceLevel}.`
    : "Perfil no configurado.";

  let previousCheckinsSummary = "Sin check-ins anteriores — este es el primero.";
  try {
    const previous = (await listPhysiqueCheckins()).filter((c) => c.date < date);
    if (previous.length > 0) {
      previousCheckinsSummary = previous.slice(-3).map((c) => `${c.date}: ${c.bodyFatPctLow}-${c.bodyFatPctHigh}%`).join(" | ");
    }
  } catch {
    // El histórico es contexto de apoyo — nunca debe romper el análisis actual.
  }

  const photos = await listPhysiquePhotosForDate(date);
  const posesProvidedSummary = photos.length > 0 ? `Incluye: ${photos.map((p) => POSE_LABEL[p.pose]).join(", ")}.` : "Sin fotos para esta fecha.";

  return { profileSummary, previousCheckinsSummary, posesProvidedSummary };
}
