"use client";

import { motion } from "framer-motion";
import { Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { formatDateLong } from "@/lib/format";
import type { Commitment, Contract } from "@/types/models";
import { FOCUS_OPTIONS } from "./catalogue";
import { shareOrDownloadArcImage } from "./ArcShareCard";
import type { DoneDaysByKind } from "./adaptive";
import { computePlanStreak } from "./streak";

/** El día 90 no tenía ninguna pantalla propia — el arco simplemente dejaba
 *  de aparecer en Hoy sin que pasara nada. Este es el momento de mayor
 *  intención de compartir y de volver a firmar de todo el producto, así que
 *  tiene que sentirse como un cierre, no como que la app se quedó sin plan. */
export function ArcCompletion({
  contract,
  commitments,
  doneDaysByKind,
  onStartNew,
}: {
  contract: Contract;
  commitments: Commitment[];
  doneDaysByKind: DoneDaysByKind;
  onStartNew: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<"shared" | "downloaded" | "failed" | null>(null);

  const focusTitle = FOCUS_OPTIONS.find((f) => f.value === contract.focus)?.title ?? "";
  const finalStreak = computePlanStreak(commitments, doneDaysByKind, contract.startedOn, contract.endsOn);

  const handleShare = async () => {
    setSharing(true);
    setShareResult(null);
    try {
      const result = await shareOrDownloadArcImage({
        focusTitle,
        durationDays: contract.durationDays,
        streak: finalStreak,
        why: contract.why,
        dateRangeLabel: `${formatDateLong(contract.startedOn)} — ${formatDateLong(contract.endsOn)}`,
      });
      setShareResult(result);
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border border-progress/25 rounded-3xl bg-progress-bg p-6 flex flex-col items-center text-center"
    >
      <span className="w-12 h-12 rounded-full bg-progress/15 border border-progress/30 flex items-center justify-center mb-4">
        <Sparkles size={20} className="text-progress" />
      </span>
      <p className="text-progress text-[11px] font-bold uppercase tracking-[.16em] mb-2">Arco completado</p>
      <h2 className="font-display font-semibold text-[30px] text-ink leading-none">
        {contract.durationDays} <span className="text-lg font-semibold text-ink-dim">días</span>
      </h2>
      <p className="text-ink text-base font-display font-semibold mt-3">{focusTitle}</p>
      <p className="text-ink-dim text-sm mt-3 leading-6 max-w-sm">&ldquo;{contract.why}&rdquo;</p>

      <div className="flex items-center gap-6 mt-5 pt-5 border-t border-progress/15 w-full justify-center">
        <div>
          <p className="font-display font-semibold text-2xl text-progress">{finalStreak}</p>
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-wide mt-0.5">Racha final</p>
        </div>
        <div>
          <p className="font-display font-semibold text-2xl text-ink">{commitments.length}</p>
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-wide mt-0.5">Compromisos</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mt-6 w-full">
        <Button
          label={sharing ? "Generando…" : "Compartir"}
          variant="secondary"
          icon={<Share2 size={16} />}
          onClick={handleShare}
          loading={sharing}
          fullWidth
        />
        <Button label="Firmar nuevo arco" onClick={onStartNew} fullWidth />
      </div>
      {shareResult === "downloaded" ? <p className="text-ink-faint text-xs mt-3">Imagen descargada.</p> : null}
      {shareResult === "failed" ? <p className="text-danger text-xs mt-3">No se pudo generar la imagen. Inténtalo de nuevo.</p> : null}
    </motion.div>
  );
}
