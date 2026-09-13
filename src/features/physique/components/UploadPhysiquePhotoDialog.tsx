"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { useAddPhysiquePhoto, useDeletePhysiquePhoto } from "@/features/physique/hooks";
import { compressImage } from "@/lib/image";
import type { PhysiquePhoto, PhysiquePose } from "@/types/models";
import { PHOTO_QUALITY_TIPS, PoseGuide } from "./PoseGuide";

const POSE_TITLE: Record<PhysiquePose, string> = {
  baseline: "Foto inicial",
  back_lats: "Espalda — dorsales",
  front_double_biceps: "Doble bíceps de frente",
  back_double_biceps: "Doble bíceps de espalda",
  side_triceps: "Tríceps de perfil",
};

export function UploadPhysiquePhotoDialog({
  open,
  onOpenChange,
  date,
  pose,
  existingPhoto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  pose: PhysiquePose;
  /** Cuando ya hay una foto para esta fecha+pose, el diálogo se abre en modo
   *  edición: preview precargado, con opción de cambiarla o borrarla. El
   *  padre monta esto con `key={date-pose}`, así que cada slot distinto es
   *  una instancia nueva — el estado inicial parte de la foto real sin
   *  necesitar un efecto para resincronizarlo. */
  existingPhoto?: PhysiquePhoto | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(() => existingPhoto?.dataUrl ?? null);
  const [compressing, setCompressing] = useState(false);
  const addPhoto = useAddPhysiquePhoto();
  const deletePhoto = useDeletePhysiquePhoto();

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCompressing(true);
    try {
      setPreview(await compressImage(file));
    } finally {
      setCompressing(false);
    }
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen) setPreview(null);
    onOpenChange(nextOpen);
  };

  const save = async () => {
    if (!preview || preview === existingPhoto?.dataUrl) return onOpenChange(false);
    await addPhoto.mutateAsync({ date, pose, dataUrl: preview, id: existingPhoto?.id });
    setPreview(null);
    onOpenChange(false);
  };

  const remove = async () => {
    if (!existingPhoto) return;
    await deletePhoto.mutateAsync({ id: existingPhoto.id, date: existingPhoto.date });
    setPreview(null);
    onOpenChange(false);
  };

  const hasChanges = preview !== null && preview !== existingPhoto?.dataUrl;

  return (
    <Dialog open={open} onOpenChange={close} title={POSE_TITLE[pose]}>
      <div className="flex flex-col gap-4">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

        {!preview ? <PoseGuide pose={pose} /> : null}

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL preview, not an optimizable remote asset
          <img src={preview} alt="Vista previa" className="w-full rounded-2xl object-cover max-h-80" />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={compressing}
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-line rounded-2xl py-10 text-ink-dim disabled:opacity-50"
          >
            {compressing ? (
              <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <>
                <ImagePlus size={22} />
                <span className="text-sm font-semibold">Hacer foto o elegir de la galería</span>
              </>
            )}
          </button>
        )}

        {!preview ? (
          <ul className="flex flex-col gap-1.5">
            {PHOTO_QUALITY_TIPS.map((tip) => (
              <li key={tip} className="text-ink-faint text-xs leading-4 flex gap-2">
                <span className="text-ink-faint shrink-0">·</span>
                {tip}
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="text-ink-dim text-xs font-semibold self-start">
            Cambiar foto
          </button>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          {existingPhoto ? (
            <Button
              label="Eliminar"
              variant="danger"
              icon={<Trash2 size={15} />}
              loading={deletePhoto.isPending}
              disabled={addPhoto.isPending}
              onClick={remove}
              fullWidth
            />
          ) : null}
          <Button label="Guardar" onClick={save} loading={addPhoto.isPending} disabled={!hasChanges || deletePhoto.isPending} fullWidth />
        </div>
      </div>
    </Dialog>
  );
}
