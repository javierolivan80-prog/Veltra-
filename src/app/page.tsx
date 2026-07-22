"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/design-system/components/Logo";
import { getProfile } from "@/features/profile/repo";

export default function RootGate() {
  const router = useRouter();

  useEffect(() => {
    getProfile()
      .then((profile) => router.replace(profile ? "/dashboard" : "/onboarding"))
      .catch(() => router.replace("/onboarding"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <Logo />
    </div>
  );
}
