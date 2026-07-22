"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { TextField } from "@/design-system/components/TextField";
import { LineChart } from "@/design-system/charts/LineChart";
import { EditProfileDialog } from "@/features/profile/EditProfileDialog";
import { useAddBodyWeightLog, useAddInjury, useBodyWeightLogs, useDeleteInjury, useInjuries, useProfile, useToggleInjury } from "@/features/profile/hooks";
import { useCurrentStreak, useRecentSessions } from "@/features/workouts/hooks";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatDateLong } from "@/lib/format";
import { useAuthStore } from "@/state/auth.store";

const EXPERIENCE_LABEL: Record<string, string> = { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado", elite: "Elite" };
const GOAL_LABEL: Record<string, string> = { strength: "Fuerza", hypertrophy: "Hipertrofia", fat_loss: "Pérdida de grasa", endurance: "Resistencia", general_fitness: "Fitness general" };
const EQUIPMENT_LABEL: Record<string, string> = { barbell: "Barra", dumbbell: "Mancuernas", machine: "Máquinas", cable: "Poleas", bodyweight: "Peso corporal", kettlebell: "Kettlebell", band: "Bandas", other: "Otro" };

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const { data: streak = 0 } = useCurrentStreak();
  const { data: sessions = [] } = useRecentSessions(200);
  const { data: injuries = [] } = useInjuries();
  const { data: weightLogs = [] } = useBodyWeightLogs();
  const addInjury = useAddInjury();
  const toggleInjury = useToggleInjury();
  const deleteInjury = useDeleteInjury();
  const addWeightLog = useAddBodyWeightLog();
  const { user, signOut } = useAuthStore();

  const [editOpen, setEditOpen] = useState(false);
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [injuryArea, setInjuryArea] = useState("");
  const [injuryNote, setInjuryNote] = useState("");
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  if (!profile) return null;

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-2xl font-display">Perfil</h1>
        <button onClick={() => setEditOpen(true)} className="px-4 py-2 rounded-full bg-surface-raised border border-line-subtle text-ink-dim text-sm font-semibold">
          Editar
        </button>
      </div>

      <Card raised>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-progress-bg border border-progress/30 flex items-center justify-center shrink-0">
            <span className="text-progress text-xl font-display">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-ink text-lg font-display truncate">{profile.fullName}</p>
            <p className="text-ink-dim text-xs mt-0.5 truncate">{user?.email ?? "Modo local"}</p>
            <div className="flex gap-1.5 mt-2">
              <Badge label={EXPERIENCE_LABEL[profile.experienceLevel]} tone="info" />
              <Badge label={GOAL_LABEL[profile.goal]} tone="progress" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card raised>
          <StatNumber value={streak} unit="días" size="sm" color="text-progress" label="Racha" />
        </Card>
        <Card raised>
          <StatNumber value={sessions.length} size="sm" color="text-info" label="Sesiones totales" />
        </Card>
        <Card raised>
          <StatNumber value={profile.bodyweightKg ?? "—"} unit="kg" size="sm" color="text-ink" label="Peso actual" />
        </Card>
      </div>

      <div>
        <SectionHeader title="Peso corporal" action={showWeightForm ? undefined : "Registrar"} onAction={() => setShowWeightForm(true)} />
        <Card raised>
          {weightLogs.length > 0 ? (
            <LineChart data={weightLogs.map((l) => ({ x: l.date, y: l.weightKg }))} color="#4DA3FF" height={140} formatX={(x) => formatDateLong(x).split(" de ")[0]} />
          ) : (
            <p className="text-ink-dim text-sm">Registra tu peso para ver la evolución aquí.</p>
          )}
          {showWeightForm ? (
            <div className="flex items-end gap-3 mt-4">
              <div className="flex-1">
                <TextField label="Peso" placeholder="75.5" inputMode="decimal" suffix="kg" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
              </div>
              <Button
                label="Guardar"
                size="md"
                onClick={async () => {
                  const kg = Number(weightInput);
                  if (kg > 0) {
                    await addWeightLog.mutateAsync(kg);
                    setWeightInput("");
                    setShowWeightForm(false);
                  }
                }}
              />
            </div>
          ) : null}
        </Card>
      </div>

      <div>
        <SectionHeader title="Lesiones" action={showInjuryForm ? undefined : "Añadir"} onAction={() => setShowInjuryForm(true)} />
        <Card raised>
          {injuries.length === 0 && !showInjuryForm ? (
            <p className="text-ink-dim text-sm">Sin lesiones registradas. Si tienes alguna molestia, añádela para que el entrenador IA la tenga en cuenta.</p>
          ) : null}
          <div className="flex flex-col gap-2.5">
            {injuries.map((injury) => (
              <div key={injury.id} className="flex items-center justify-between bg-surface rounded-xl px-3.5 py-3 gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${injury.active ? "text-ink" : "text-ink-faint line-through"}`}>{injury.area}</p>
                  <p className="text-ink-faint text-xs mt-0.5 truncate">{injury.note}</p>
                </div>
                <button onClick={() => toggleInjury.mutate(injury.id)} className="text-info text-xs font-semibold shrink-0">
                  {injury.active ? "Activa" : "Resuelta"}
                </button>
                <button onClick={() => deleteInjury.mutate(injury.id)} className="shrink-0">
                  <Trash2 size={14} className="text-danger" />
                </button>
              </div>
            ))}
          </div>
          {showInjuryForm ? (
            <div className="flex flex-col gap-3 mt-3">
              <TextField label="Zona" placeholder="p. ej. Hombro derecho" value={injuryArea} onChange={(e) => setInjuryArea(e.target.value)} />
              <TextField label="Nota" placeholder="Describe la molestia…" value={injuryNote} onChange={(e) => setInjuryNote(e.target.value)} />
              <Button
                label="Guardar lesión"
                size="md"
                onClick={async () => {
                  if (injuryArea.trim()) {
                    await addInjury.mutateAsync({ area: injuryArea.trim(), note: injuryNote.trim() });
                    setInjuryArea("");
                    setInjuryNote("");
                    setShowInjuryForm(false);
                  }
                }}
              />
            </div>
          ) : null}
        </Card>
      </div>

      <div>
        <SectionHeader title="Equipamiento disponible" />
        <div className="flex flex-wrap gap-2">
          {profile.equipmentAvailable.map((eq) => (
            <Badge key={eq} label={EQUIPMENT_LABEL[eq] ?? eq} tone="neutral" />
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Cuenta" />
        <Card raised>
          {!isSupabaseConfigured ? (
            <p className="text-ink-dim text-sm leading-5">
              Tus datos se guardan en este navegador. Configura Supabase para crear una cuenta real y sincronizar entre dispositivos (ver README).
            </p>
          ) : user ? (
            <Button
              label="Cerrar sesión"
              variant="danger"
              onClick={() => {
                if (confirm("¿Seguro que quieres salir?")) signOut();
              }}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              <p className="text-ink-dim text-sm mb-1">No has iniciado sesión.</p>
              <Button label="Iniciar sesión / Crear cuenta" onClick={() => (window.location.href = "/sign-in")} />
            </div>
          )}
        </Card>
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
