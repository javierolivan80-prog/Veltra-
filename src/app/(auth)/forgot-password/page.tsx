"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Logo } from "@/design-system/components/Logo";
import { TextField } from "@/design-system/components/TextField";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useAuthStore } from "@/state/auth.store";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);
    if (result.ok) setSent(true);
    else setError(result.error ?? "Ha ocurrido un error.");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="text-ink-dim text-sm">Recupera tu contraseña</p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="bg-warn-bg border border-warn/30 rounded-2xl p-4">
          <p className="text-warn text-sm font-semibold">No disponible sin Supabase configurado</p>
        </div>
      ) : sent ? (
        <div className="bg-progress-bg border border-progress/30 rounded-2xl p-5 text-center">
          <p className="text-progress text-base font-semibold">Revisa tu correo</p>
          <p className="text-ink-dim text-sm mt-1.5 leading-5">
            Te hemos enviado un enlace para restablecer tu contraseña a <span className="text-ink">{email}</span>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TextField label="Email" placeholder="tú@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <p className="text-danger text-sm font-medium">{error}</p> : null}
          <Button type="submit" label="Enviar enlace" loading={loading} fullWidth size="lg" />
        </form>
      )}

      <Link href="/sign-in" className="text-center text-progress text-sm font-semibold">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
