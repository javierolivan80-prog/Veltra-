"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { AuthForm } from "@/features/auth/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AccountStep({ fullName, onDone }: { fullName: string; onDone: () => void }) {
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-2xl font-display">Guarda tu progreso</h1>
        <p className="text-ink-dim text-sm mt-1 leading-5">
          Crea una cuenta para sincronizar entre dispositivos, o continúa en modo local — tus datos ya están seguros en este dispositivo de todas
          formas.
        </p>
      </div>

      <AuthForm mode={mode} fullName={fullName} onSuccess={onDone} />

      {isSupabaseConfigured ? (
        <p className="text-center text-ink-dim text-sm">
          {mode === "sign-up" ? "¿Ya tienes cuenta? " : "¿Primera vez aquí? "}
          <button type="button" className="text-progress font-semibold" onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}>
            {mode === "sign-up" ? "Inicia sesión" : "Crea una cuenta"}
          </button>
        </p>
      ) : null}

      <Button label="Continuar en modo local" variant="ghost" onClick={onDone} fullWidth />
    </div>
  );
}
