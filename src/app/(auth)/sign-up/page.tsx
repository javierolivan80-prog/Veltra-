"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/design-system/components/Logo";
import { AuthForm } from "@/features/auth/AuthForm";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="text-ink-dim text-sm">Crea tu cuenta Veltra</p>
      </div>

      <AuthForm mode="sign-up" onSuccess={() => router.push("/onboarding?step=profile")} />

      <p className="text-center text-sm text-ink-dim">
        ¿Ya tienes cuenta?{" "}
        <Link href="/sign-in" className="text-progress font-semibold">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
