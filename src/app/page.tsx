"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/design-system/components/Logo";
import { LandingPage } from "@/features/marketing/LandingPage";
import { getProfile, isOnboarded } from "@/features/profile/repo";

type Gate = "checking" | "landing";

/** Alguien que ya tiene perfil (completo o a medias) va directo a donde
 *  estaba — Hoy o el onboarding en curso. Alguien sin perfil (visitante
 *  nuevo, o sesión cerrada) ve la landing en vez de un redirect instantáneo:
 *  es la única puerta pública de la app, así que tiene que vender el
 *  producto, no solo abrir paso a él. */
export default function RootGate() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile) router.replace(isOnboarded(profile) ? "/dashboard" : "/onboarding");
        else setGate("landing");
      })
      .catch(() => {
        if (!cancelled) setGate("landing");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (gate === "landing") return <LandingPage />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <Logo />
    </div>
  );
}
