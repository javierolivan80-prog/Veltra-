import { listPhysiquePhotosForDate, upsertPhysiqueCheckin } from "@/features/physique/repo";
import { dataUrlToImageBlock } from "@/lib/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PhysiqueCheckin, PhysiquePose } from "@/types/models";
import { AI_FUNCTION_NAME } from "./functionName";
import { buildPhysiqueContext } from "./physiqueContext";

/**
 * Analiza las fotos de una fecha y guarda el check-in. A diferencia de Food o
 * el coach, esto NO tiene fallback local: no existe una forma razonable de
 * estimar grasa corporal sin visión por IA, así que un fallo aquí se ve como
 * un error real — nunca se convierte en un número inventado.
 */
export async function analyzePhysiqueCheckin(date: string): Promise<PhysiqueCheckin> {
  const photos = await listPhysiquePhotosForDate(date);
  if (photos.length === 0) throw new Error("No hay fotos para esta fecha.");
  if (!isSupabaseConfigured) throw new Error("El análisis de físico necesita Veltra Cloud conectado.");

  const supabase = getSupabaseBrowserClient()!;
  const context = await buildPhysiqueContext(date);
  const images = photos
    .map((p) => {
      const block = dataUrlToImageBlock(p.dataUrl);
      return block ? { pose: p.pose, ...block } : null;
    })
    .filter((img): img is { pose: PhysiquePose; media_type: string; data: string } => img !== null);

  const { data, error } = await supabase.functions.invoke(AI_FUNCTION_NAME, { body: { type: "physique", images, context } });
  if (error) throw error;
  if (!data?.checkin) throw new Error(data?.reply || "No se pudo analizar. Inténtalo de nuevo.");

  return upsertPhysiqueCheckin({
    date,
    bodyFatPctLow: data.checkin.bodyFatLow,
    bodyFatPctHigh: data.checkin.bodyFatHigh,
    muscleNotes: data.checkin.muscleNotes,
    trendNotes: data.checkin.trendNotes ?? null,
    summary: data.reply || "",
  });
}
