"use client";

import { Check, Copy, Flame, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { TextField } from "@/design-system/components/TextField";
import { useFriends, useMyInviteCode, useRedeemInviteCode } from "@/features/friends/hooks";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function FriendsPage() {
  const { data: code } = useMyInviteCode();
  const { data: friends = [], isLoading: friendsLoading } = useFriends();
  const redeem = useRedeemInviteCode();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (!code) return;
    const text = `Añádeme en Veltra con mi código: ${code}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Veltra", text });
        return;
      } catch {
        // Cerró el share sheet sin elegir nada — cae al copiado como respaldo.
      }
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de clipboard tampoco — el código ya está visible en pantalla.
    }
  };

  const handleRedeem = () => {
    if (!input.trim()) return;
    redeem.mutate(input, { onSuccess: () => setInput("") });
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col gap-6">
        <CategoryBackLink href="/profile" label="Perfil" />
        <EmptyState
          icon={<Users size={28} className="text-ink-faint" />}
          title="Amigos no disponible sin la nube"
          description="Ver el progreso de otra persona necesita un servidor que los dos comparten. Este entorno todavía no tiene un proyecto Supabase configurado."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/profile" label="Perfil" />
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
          <Users size={20} className="text-progress" />
        </span>
        <div>
          <h1 className="text-ink font-display font-semibold text-[22px] leading-tight">Amigos</h1>
          <p className="text-ink-dim text-xs mt-0.5">Solo ven tu racha y tu día de arco — nada más.</p>
        </div>
      </div>

      <Card raised>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2">Tu código</p>
        <p className="text-ink-dim text-sm leading-5 mb-4">
          Quien tenga este código puede añadirte y ver tu progreso. Compártelo solo con quien quieras que lo vea.
        </p>
        <div className="flex items-center gap-3">
          <span className="flex-1 font-display font-bold text-2xl tracking-[.2em] text-ink bg-bg-soft border border-line-subtle rounded-xl px-4 py-3 text-center">
            {code ?? "······"}
          </span>
          <Button
            label={copied ? "Copiado" : "Compartir"}
            variant="secondary"
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
            onClick={share}
            disabled={!code}
          />
        </div>
      </Card>

      <Card raised>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2">Añadir a alguien</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Código de 6 caracteres"
              maxLength={6}
            />
          </div>
          <Button label="Añadir" onClick={handleRedeem} loading={redeem.isPending} disabled={!input.trim()} />
        </div>
        {redeem.isError ? (
          <p className="text-danger text-xs mt-3 leading-5">
            {redeem.error instanceof Error ? redeem.error.message : "No se pudo añadir. Inténtalo de nuevo."}
          </p>
        ) : null}
      </Card>

      <div>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">
          {friends.length > 0 ? `Siguiendo · ${friends.length}` : "Siguiendo"}
        </p>
        {!friendsLoading && friends.length === 0 ? (
          <Card raised>
            <EmptyState
              title="Todavía no sigues a nadie"
              description="Pide el código a alguien y añádelo arriba, o comparte el tuyo para que te añada."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {friends.map((f) => (
              <div key={f.userId} className="border border-line-subtle rounded-2xl bg-bg-soft px-4 py-4 flex items-center justify-between gap-3">
                <p className="text-ink text-[15px] font-display font-semibold truncate">{f.displayName}</p>
                <div className="flex items-center gap-4 shrink-0">
                  {f.streak > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <Flame size={14} className="text-record" />
                      <span className="text-ink text-sm font-semibold">{f.streak}</span>
                    </div>
                  ) : null}
                  <span className="text-ink-faint text-xs font-semibold">
                    {f.arcDay !== null && f.arcDurationDays !== null ? `Día ${f.arcDay} de ${f.arcDurationDays}` : "Sin arco activo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
