"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { useAddPhysiquePhoto } from "@/features/physique/hooks";
import { compressImage } from "@/lib/image";
import type { PhysiquePose } from "@/types/models";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  pose: PhysiquePose;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const addPhoto = useAddPhysiquePhoto();

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
    if (!preview) return;
    await addPhoto.mutateAsync({ date, pose, dataUrl: preview });
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close} title={POSE_TITLE[pose]}>
      <div className="flex flex-col gap-4">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

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

        {preview ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="text-ink-dim text-xs font-semibold self-start">
            Cambiar foto
          </button>
        ) : null}

        <Button label="Guardar" onClick={save} loading={addPhoto.isPending} disabled={!preview} fullWidth />
      </div>
    </Dialog>
  );
}
