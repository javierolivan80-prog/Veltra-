"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Logo } from "@/design-system/components/Logo";
import { TextField } from "@/design-system/components/TextField";
import { useAuthStore } from "@/state/auth.store";

export default function ResetPasswordPage() {
  const router = useRouter();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.ok) router.replace("/dashboard");
    else setError(result.error ?? "Ha ocurrido un error.");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="text-ink-dim text-sm">Elige una nueva contraseña</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label="Nueva contraseña" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-danger text-sm font-medium">{error}</p> : null}
        <Button type="submit" label="Guardar contraseña" loading={loading} fullWidth size="lg" />
      </form>
    </div>
  );
}
