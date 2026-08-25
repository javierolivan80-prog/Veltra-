"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/design-system/components/Logo";
import { AuthForm } from "@/features/auth/AuthForm";

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="text-ink-dim text-sm">Bienvenido de nuevo</p>
      </div>

      <AuthForm mode="sign-in" onSuccess={() => router.push("/dashboard")} />

      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-ink-dim hover:text-ink">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/sign-up" className="text-progress font-semibold">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
