"use client";

import { motion } from "framer-motion";
import {
  Book,
  Brain,
  Cross,
  Dumbbell,
  Moon,
  ShieldAlert,
  Sparkles,
  Target,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/design-system/components/Logo";

const MODULES: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Dumbbell, label: "Entrenamiento", color: "text-progress" },
  { icon: Moon, label: "Sueño", color: "text-sleep" },
  { icon: UtensilsCrossed, label: "Nutrición", color: "text-progress" },
  { icon: Brain, label: "Meditación", color: "text-ai" },
  { icon: Book, label: "Diario", color: "text-progress" },
  { icon: Target, label: "Enfoque", color: "text-info" },
  { icon: ShieldAlert, label: "Adicciones", color: "text-addiction" },
  { icon: Cross, label: "Fe", color: "text-progress" },
  { icon: Wallet, label: "Finanzas", color: "text-record" },
];

const STEPS = [
  {
    n: "01",
    title: "Firmas tu contrato",
    body: "30, 60 o 90 días. Eliges qué compromisos van dentro — entrenar, dormir 8 horas, meditar, escribir — y por qué te importa de verdad. Esa razón vuelve a aparecer el día que quieras rendirte.",
  },
  {
    n: "02",
    title: "Cada día, un plan, no una lista",
    body: "Veltra convierte tus compromisos en el plan concreto de hoy. Nada que inventar, nada que decidir a las 7 de la mañana.",
  },
  {
    n: "03",
    title: "El sistema se ajusta solo",
    body: "Si fallas un compromiso dos días seguidos, te avisa citando tu propia razón antes de que sea tarde. Si fallas tres, baja la frecuencia sola — no desaparece el compromiso, se adapta a lo que de verdad estás haciendo.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto">
        <Logo size="sm" />
        <Link href="/sign-in" className="text-ink-dim text-sm font-semibold hover:text-ink transition-colors">
          Iniciar sesión
        </Link>
      </header>

      <main className="px-6">
        {/* Hero */}
        <section className="max-w-3xl mx-auto pt-10 pb-16 flex flex-col items-center text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-progress text-[11px] font-bold uppercase tracking-[.16em] border border-progress/25 bg-progress-bg rounded-full px-3 py-1.5 mb-6"
          >
            Un arco de 30, 60 o 90 días
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-display font-semibold text-[38px] sm:text-[52px] leading-[1.05] tracking-tight text-balance"
          >
            No necesitas otro tracker.
            <br />
            Necesitas <span className="text-progress">terminar lo que empiezas.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-ink-dim text-base sm:text-lg mt-5 max-w-xl leading-relaxed text-balance"
          >
            Veltra une entrenamiento, sueño, nutrición, mente y disciplina en un único plan diario — y se adapta
            cuando fallas, en vez de hacer como que no ha pasado nada.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3 mt-9 w-full sm:w-auto"
          >
            <Link
              href="/onboarding"
              className="bg-progress text-bg-deep font-display font-bold text-base px-7 py-4 rounded-2xl hover:bg-progress/90 transition-colors text-center"
            >
              Empieza tu arco
            </Link>
            <Link
              href="/onboarding"
              className="border border-line text-ink font-display font-semibold text-base px-7 py-4 rounded-2xl hover:bg-surface transition-colors text-center"
            >
              Ver cómo funciona
            </Link>
          </motion.div>
          <p className="text-ink-faint text-xs mt-4">Gratis. Sin tarjeta. Empiezas en menos de 2 minutos.</p>
        </section>

        {/* Módulos */}
        <section className="max-w-3xl mx-auto pb-16">
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] text-center mb-5">
            Un sistema, no nueve apps
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {MODULES.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 border border-line-subtle rounded-2xl bg-bg-soft px-3 py-4"
              >
                <Icon size={18} className={color} />
                <span className="text-ink-dim text-[11px] font-semibold text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="max-w-3xl mx-auto pb-16">
          <div className="flex flex-col gap-5">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-5 border border-line-subtle rounded-3xl bg-surface p-6">
                <span className="font-display font-bold text-2xl text-line shrink-0">{step.n}</span>
                <div>
                  <h3 className="font-display font-semibold text-lg text-ink">{step.title}</h3>
                  <p className="text-ink-dim text-sm mt-2 leading-6">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* IA */}
        <section className="max-w-3xl mx-auto pb-16">
          <div className="border border-ai/25 rounded-3xl bg-ai-bg p-7">
            <div className="flex items-center gap-2.5 mb-3">
              <Sparkles size={16} className="text-ai" />
              <span className="text-ai text-[11px] font-bold uppercase tracking-[.14em]">Entrenador con IA</span>
            </div>
            <p className="text-ink text-base leading-relaxed">
              Veltra cruza tus datos entre módulos — si duermes peor tu ánimo baja al día siguiente, si acumulas
              fatiga en tus series te sugiere una descarga antes de que te lesiones — y lo trae a tu plan diario sin
              que tengas que pedirlo.
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-2xl mx-auto pb-20 text-center">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl text-ink text-balance">
            Dentro de 90 días vas a estar en un sitio distinto.
          </h2>
          <p className="text-ink-dim text-sm sm:text-base mt-3 mb-7">La pregunta es si vas a llegar con un plan o sin él.</p>
          <Link
            href="/onboarding"
            className="inline-block bg-progress text-bg-deep font-display font-bold text-base px-8 py-4 rounded-2xl hover:bg-progress/90 transition-colors"
          >
            Firmar mi contrato
          </Link>
        </section>
      </main>

      <footer className="border-t border-line-subtle px-6 py-8 text-center">
        <p className="text-ink-faint text-xs">Veltra — un arco de transformación, no otra app de hábitos.</p>
      </footer>
    </div>
  );
}
