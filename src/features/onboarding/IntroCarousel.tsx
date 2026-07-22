"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cpu, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";

const SLIDES = [
  {
    icon: TrendingUp,
    accent: "#2CE6A0",
    title: "Disfruta viendo cómo progresas",
    body: "Veltra no es una app para apuntar entrenamientos. Es la sensación de ver tu progreso, semana tras semana.",
  },
  {
    icon: Zap,
    accent: "#4DA3FF",
    title: "Registra una serie en menos de 3 segundos",
    body: "Abre tu rutina y pulsa el ejercicio actual. Veltra recuerda tu peso, tus repeticiones y tu descanso.",
  },
  {
    icon: Cpu,
    accent: "#A374FF",
    title: "Tu entrenador personal con IA",
    body: "Conoce tu historial, tus lesiones y tus objetivos reales — y celebra contigo cada récord y cada subida de rango.",
  },
];

export function IntroCarousel({ onFinish }: { onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const Icon = slide.icon;

  const goNext = () => {
    if (page < SLIDES.length - 1) setPage((p) => p + 1);
    else onFinish();
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="flex-1 flex items-center justify-center px-9 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center mb-9"
              style={{ background: `radial-gradient(circle, ${slide.accent}33, transparent 70%)` }}
            >
              <div className="w-24 h-24 rounded-full bg-surface border border-line flex items-center justify-center">
                <Icon size={40} color={slide.accent} />
              </div>
            </div>
            <h1 className="text-ink text-3xl font-display leading-9">{slide.title}</h1>
            <p className="text-ink-dim text-base mt-4 leading-6">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-10 max-w-sm mx-auto w-full">
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((s, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === page ? 22 : 7, backgroundColor: i === page ? s.accent : "#2A2A2E" }}
            />
          ))}
        </div>
        <Button label={page === SLIDES.length - 1 ? "Comenzar" : "Continuar"} onClick={goNext} fullWidth size="lg" />
      </div>
    </div>
  );
}
