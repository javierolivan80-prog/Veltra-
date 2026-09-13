"use client";

import { motion } from "framer-motion";

const MARK_PX = { sm: 18, md: 24, lg: 34 } as const;
const TEXT_SIZE = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" } as const;

/** Mismo anillo + punto que public/icon.svg — el icono real que queda en la
 *  pantalla de inicio del móvil. Antes el wordmark llevaba un punto verde
 *  suelto sin relación con ese icono; ahora es la misma marca en los dos
 *  sitios, no dos logos distintos que nunca se ven juntos. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = MARK_PX[size];

  return (
    <div className="flex items-center gap-2.5">
      <svg width={px} height={px} viewBox="0 0 512 512" fill="none" aria-hidden>
        <circle cx="256" cy="256" r="132" stroke="#2CE6A0" strokeWidth="28" />
        <motion.circle
          cx="256"
          cy="124"
          r="22"
          fill="#2CE6A0"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <span className={`${TEXT_SIZE[size]} font-display text-ink tracking-[2px]`}>VELTRA</span>
    </div>
  );
}
