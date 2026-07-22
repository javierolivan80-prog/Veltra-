"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/design-system/components/Logo";
import { AuthForm } from "@/features/auth/AuthForm";
import { GoogleButton } from "@/features/auth/GoogleButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="text-ink-dim text-sm">Crea tu cuenta Veltra</p>
      </div>

      {isSupabaseConfigured ? (
        <>
          <GoogleButton next="/onboarding?step=profile" />
          <div className="flex items-center gap-3">
            <div className="h-px bg-line-subtle flex-1" />
            <span className="text-ink-faint text-xs">o con email</span>
            <div className="h-px bg-line-subtle flex-1" />
          </div>
        </>
      ) : null}

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
