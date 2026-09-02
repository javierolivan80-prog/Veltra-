"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ContractFlow } from "@/features/contract/ContractFlow";
import { useActiveContract, useCreateContract } from "@/features/contract/hooks";
import type { ContractDraft } from "@/features/contract/repo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useAuthStore } from "@/state/auth.store";

export default function ContractOnboardingPage() {
  const router = useRouter();
  const { data: active, isLoading } = useActiveContract();
  const createContract = useCreateContract();
  const signOut = useAuthStore((s) => s.signOut);
  const [error, setError] = useState<string | null>(null);

  // Quien ya tiene contrato no vuelve a firmarlo — p. ej. al abrir el enlace
  // a mano o al volver atrás desde Hoy.
  useEffect(() => {
    if (!isLoading && active) router.replace("/dashboard");
  }, [isLoading, active, router]);

  const submit = async (draft: ContractDraft) => {
    setError(null);
    try {
      await createContract.mutateAsync(draft);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar tu contrato. Inténtalo de nuevo.");
    }
  };

  if (isLoading || active) return null;

  return (
    <div className="relative">
      <ContractFlow onSubmit={submit} submitting={createContract.isPending} error={error} />
      {/* El contrato es obligatorio para entrar, y cerrar sesión vive dentro
          de la app: sin esta salida, quien no quiera firmarlo se queda
          encerrado en su propia cuenta. */}
      {isSupabaseConfigured ? (
        <button
          onClick={() => {
            if (confirm("¿Seguro que quieres salir? Podrás firmar tu contrato la próxima vez que entres.")) signOut();
          }}
          className="absolute top-10 right-6 text-ink-faint hover:text-ink text-xs font-semibold"
        >
          Cerrar sesión
        </button>
      ) : null}
    </div>
  );
}
