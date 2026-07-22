"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface CelebrationOverlayProps {
  open: boolean;
  onDismiss: () => void;
  eyebrow: string;
  title: string;
  subtitle?: string;
  accentColor: string;
  icon: ReactNode;
}

function Particle({ index, color }: { index: number; color: string }) {
  const angle = (index / 14) * Math.PI * 2 + (index % 3) * 0.15;
  const distance = 90 + (index % 5) * 14;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance - 40;

  return (
    <motion.span
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color, left: "50%", top: "50%" }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x, y, scale: 0.4 }}
      transition={{ duration: 0.8, delay: index * 0.012, ease: "easeOut" }}
    />
  );
}

export function CelebrationOverlay({ open, onDismiss, eyebrow, title, subtitle, accentColor, icon }: CelebrationOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Cerrar" onClick={onDismiss} className="absolute inset-0 bg-black/85" />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 14, stiffness: 180 }}
            className="relative z-10 flex flex-col items-center max-w-sm w-full"
          >
            <div className="relative w-40 h-40 flex items-center justify-center">
              {Array.from({ length: 14 }).map((_, i) => (
                <Particle key={i} index={i} color={accentColor} />
              ))}
              {icon}
            </div>
            <p className="text-ink-dim text-xs font-bold tracking-[3px] uppercase mt-6">{eyebrow}</p>
            <h2 className="text-ink text-3xl font-display text-center mt-2">{title}</h2>
            {subtitle ? <p className="text-ink-dim text-base text-center mt-2 leading-6">{subtitle}</p> : null}
            <div className="mt-8 w-full">
              <Button label="Seguir entrenando" onClick={onDismiss} fullWidth />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
