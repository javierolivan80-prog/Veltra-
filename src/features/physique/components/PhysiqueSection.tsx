"use client";

import { Camera, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { ProgressChart } from "@/features/exercises/components/ProgressChart";
import { useAnalyzePhysiqueCheckin, useListPhysiqueCheckins, useListPhysiquePhotos } from "@/features/physique/hooks";
import { errorMessage } from "@/lib/errors";
import { formatDateLong } from "@/lib/format";
import { todayKey } from "@/lib/date";
import type { PhysiquePhoto, PhysiquePose } from "@/types/models";
import { UploadPhysiquePhotoDialog } from "./UploadPhysiquePhotoDialog";

const POSE_LABEL: Record<PhysiquePose, string> = {
  baseline: "Inicial",
  back_lats: "Espalda",
  front_double_biceps: "Bíceps frente",
  back_double_biceps: "Bíceps espalda",
  side_triceps: "Tríceps",
};

const WEEKLY_POSES: PhysiquePose[] = ["back_lats", "front_double_biceps", "back_double_biceps", "side_triceps"];

/** Autocontenido: pide sus propios datos, así que añadirlo a Progreso es una
 *  línea — igual que ProgressAnalysisCard/ExerciseSearchDialog en esta misma
 *  página. Vive aquí (no en una pantalla propia) porque el usuario lo pidió
 *  explícitamente dentro de "Progreso". */
export function PhysiqueSection() {
  const { data: photos = [] } = useListPhysiquePhotos();
  const { data: checkins = [] } = useListPhysiqueCheckins();
  const analyze = useAnalyzePhysiqueCheckin();
  const [uploadTarget, setUploadTarget] = useState<{ date: string; pose: PhysiquePose } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<{ date: string; message: string } | null>(null);

  const today = todayKey();
  const baselinePhoto = useMemo(() => photos.find((p) => p.pose === "baseline") ?? null, [photos]);

  const photosByDate = useMemo(() => {
    const map = new Map<string, PhysiquePhoto[]>();
    for (const p of photos) {
      if (p.pose === "baseline") continue;
      const arr = map.get(p.date);
      if (arr) arr.push(p);
      else map.set(p.date, [p]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [photos]);

  const checkinByDate = useMemo(() => new Map(checkins.map((c) => [c.date, c])), [checkins]);

  const chartPoints = useMemo(
    () => checkins.map((c) => ({ date: c.date, value: Math.round(((c.bodyFatPctLow + c.bodyFatPctHigh) / 2) * 10) / 10 })),
    [checkins]
  );

  const handleAnalyze = async (date: string) => {
    setAnalyzeError(null);
    try {
      await analyze.mutateAsync(date);
    } catch (err) {
      setAnalyzeError({ date, message: errorMessage(err, "No se pudo analizar. Inténtalo de nuevo.") });
    }
  };

  return (
    <div className="flex flex-col gap-4 border-t border-line-subtle pt-5">
      <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Físico · fotos de progreso</p>

      {baselinePhoto ? (
        <Card raised className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no es un asset remoto optimizable */}
          <img src={baselinePhoto.dataUrl} alt="Foto inicial" className="w-16 h-16 rounded-xl object-cover shrink-0" />
          <div className="min-w-0">
            <Badge label="Día 1" tone="neutral" />
            <p className="text-ink-faint text-xs mt-1.5">{formatDateLong(baselinePhoto.date)}</p>
          </div>
        </Card>
      ) : (
        <Card raised>
          <EmptyState
            title="Sube tu foto inicial"
            description="El punto de partida con el que se comparará cada check-in semanal."
            actionLabel="Subir foto inicial"
            onAction={() => setUploadTarget({ date: today, pose: "baseline" })}
          />
        </Card>
      )}

      {baselinePhoto && photosByDate.length === 0 ? (
        <button
          onClick={() => setUploadTarget({ date: today, pose: WEEKLY_POSES[0] })}
          className="flex items-center justify-center gap-2 border border-dashed border-line rounded-2xl px-4 py-3.5 text-ink-dim text-sm font-semibold"
        >
          <Camera size={15} />
          Empezar el primer check-in semanal
        </button>
      ) : null}

      {photosByDate.map(([date, datePhotos]) => {
        const checkin = checkinByDate.get(date);
        const isAnalyzing = analyze.isPending && analyze.variables === date;
        return (
          <Card key={date} raised>
            <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wide">{formatDateLong(date)}</p>
            <div className="flex gap-2 mt-3">
              {WEEKLY_POSES.map((pose) => {
                const photo = datePhotos.find((p) => p.pose === pose);
                return photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL, no es un asset remoto optimizable
                  <img key={pose} src={photo.dataUrl} alt={POSE_LABEL[pose]} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <button
                    key={pose}
                    onClick={() => setUploadTarget({ date, pose })}
                    className="w-14 h-14 rounded-lg border border-dashed border-line flex items-center justify-center text-ink-faint shrink-0"
                    aria-label={`Subir foto: ${POSE_LABEL[pose]}`}
                  >
                    <Camera size={16} />
                  </button>
                );
              })}
            </div>

            {checkin ? (
              <div className="mt-3.5 border-t border-line-subtle pt-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-display font-semibold text-lg">
                    {checkin.bodyFatPctLow}–{checkin.bodyFatPctHigh}%
                  </span>
                  <Badge label="Estimación visual" tone="ai" />
                </div>
                {checkin.muscleNotes ? <p className="text-ink-dim text-sm mt-2 leading-5">{checkin.muscleNotes}</p> : null}
                {checkin.trendNotes ? <p className="text-ai text-sm mt-2 leading-5">{checkin.trendNotes}</p> : null}
              </div>
            ) : datePhotos.length > 0 ? (
              <div className="mt-3.5 border-t border-line-subtle pt-3.5">
                <Button label="Analizar" variant="secondary" size="sm" icon={<Sparkles size={14} className="text-ai" />} loading={isAnalyzing} onClick={() => handleAnalyze(date)} />
                {analyzeError?.date === date ? <p className="text-danger text-xs mt-2">{analyzeError.message}</p> : null}
              </div>
            ) : null}
          </Card>
        );
      })}

      {chartPoints.length >= 2 ? (
        <Card raised>
          <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wider mb-2">Evolución % grasa estimada</p>
          <ProgressChart points={chartPoints} color="#4DA3FF" unit="%" pr={null} />
          <p className="text-ink-faint text-[11px] mt-2">Estimación visual por IA, no una medición clínica.</p>
        </Card>
      ) : null}

      <UploadPhysiquePhotoDialog
        open={uploadTarget !== null}
        date={uploadTarget?.date ?? today}
        pose={uploadTarget?.pose ?? "baseline"}
        onOpenChange={(open) => !open && setUploadTarget(null)}
      />
    </div>
  );
}
