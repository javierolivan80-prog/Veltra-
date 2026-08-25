"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { TextField } from "@/design-system/components/TextField";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useAuthStore } from "@/state/auth.store";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode, fullName, onSuccess }: { mode: Mode; fullName?: string; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signIn, signUp, loading } = useAuthStore();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Introduce un email válido y una contraseña de al menos 6 caracteres.");
      return;
    }
    const result = mode === "sign-up" ? await signUp(email.trim(), password, fullName ?? "") : await signIn(email.trim(), password);
    if (!result.ok) {
      setError(result.error ?? "Ha ocurrido un error.");
      return;
    }
    if (mode === "sign-up" && "needsEmailConfirmation" in result && result.needsEmailConfirmation) {
      setConfirmationSent(true);
      return;
    }
    onSuccess();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="bg-warn-bg border border-warn/30 rounded-2xl p-4">
        <p className="text-warn text-sm font-semibold">Inicio de sesión en la nube no disponible</p>
        <p className="text-ink-dim text-sm mt-1.5 leading-5">
          Este entorno todavía no tiene un proyecto Supabase configurado. El sistema de cuentas está completamente implementado y listo — en
          cuanto se añadan las claves (ver README), el registro y el inicio de sesión funcionarán aquí mismo.
        </p>
      </div>
    );
  }

  if (confirmationSent) {
    return (
      <div className="bg-progress-bg border border-progress/30 rounded-2xl p-5 text-center">
        <p className="text-progress text-base font-semibold">Revisa tu correo</p>
        <p className="text-ink-dim text-sm mt-1.5 leading-5">
          Te hemos enviado un enlace de verificación a <span className="text-ink">{email}</span>. Confírmalo para activar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField label="Email" placeholder="tú@email.com" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField
        label="Contraseña"
        placeholder="••••••••"
        type="password"
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-danger text-sm font-medium">{error}</p> : null}
      <Button type="submit" label={mode === "sign-up" ? "Crear cuenta" : "Iniciar sesión"} loading={loading} fullWidth size="lg" />
    </form>
  );
}
