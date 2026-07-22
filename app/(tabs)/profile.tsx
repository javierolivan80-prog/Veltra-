import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Badge } from "@/src/design-system/components/Badge";
import { Button } from "@/src/design-system/components/Button";
import { Card } from "@/src/design-system/components/Card";
import { Screen } from "@/src/design-system/components/Screen";
import { SectionHeader } from "@/src/design-system/components/SectionHeader";
import { StatNumber } from "@/src/design-system/components/StatNumber";
import { TextField } from "@/src/design-system/components/TextField";
import { LineChart } from "@/src/design-system/charts/LineChart";
import { useAddBodyWeightLog, useAddInjury, useBodyWeightLogs, useDeleteInjury, useInjuries, useProfile, useToggleInjury } from "@/src/features/profile/hooks";
import { useCurrentStreak, useRecentSessions } from "@/src/features/workouts/hooks";
import { useSyncStatus } from "@/src/features/profile/useSyncStatus";
import { useAuthStore } from "@/src/state/auth.store";
import { formatDateLong } from "@/src/lib/format";

const EXPERIENCE_LABEL: Record<string, string> = { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado", elite: "Elite" };
const GOAL_LABEL: Record<string, string> = { strength: "Fuerza", hypertrophy: "Hipertrofia", fat_loss: "Pérdida de grasa", endurance: "Resistencia", general_fitness: "Fitness general" };
const EQUIPMENT_LABEL: Record<string, string> = { barbell: "Barra", dumbbell: "Mancuernas", machine: "Máquinas", cable: "Poleas", bodyweight: "Peso corporal", kettlebell: "Kettlebell", band: "Bandas", other: "Otro" };

export default function ProfileScreen() {
  const { data: profile } = useProfile();
  const { data: streak = 0 } = useCurrentStreak();
  const { data: sessions = [] } = useRecentSessions(200);
  const { data: injuries = [] } = useInjuries();
  const { data: weightLogs = [] } = useBodyWeightLogs();
  const addInjury = useAddInjury();
  const toggleInjury = useToggleInjury();
  const deleteInjury = useDeleteInjury();
  const addWeightLog = useAddBodyWeightLog();
  const sync = useSyncStatus();
  const { user, signOut } = useAuthStore();

  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [injuryArea, setInjuryArea] = useState("");
  const [injuryNote, setInjuryNote] = useState("");
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  if (!profile) return <View className="flex-1 bg-bg" />;

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Screen contentClassName="pt-3 pb-32">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-ink text-2xl font-display">Perfil</Text>
        <Pressable onPress={() => router.push("/profile/edit")} className="px-4 py-2 rounded-full bg-surface-raised border border-line-subtle">
          <Text className="text-ink-dim text-sm font-body-semibold">Editar</Text>
        </Pressable>
      </View>

      <Card raised className="mb-6">
        <View className="flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-progress-bg border border-progress/30 items-center justify-center">
            <Text className="text-progress text-xl font-display">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-ink text-lg font-display">{profile.fullName}</Text>
            <Text className="text-ink-dim text-xs font-body mt-0.5">{user?.email ?? (profile.email || "Modo local")}</Text>
            <View className="flex-row gap-1.5 mt-2">
              <Badge label={EXPERIENCE_LABEL[profile.experienceLevel]} tone="info" />
              <Badge label={GOAL_LABEL[profile.goal]} tone="progress" />
            </View>
          </View>
        </View>
      </Card>

      <View className="flex-row gap-3 mb-6">
        <Card className="flex-1" raised>
          <StatNumber value={streak} unit="días" size="sm" color="text-progress" label="Racha" />
        </Card>
        <Card className="flex-1" raised>
          <StatNumber value={sessions.length} size="sm" color="text-info" label="Sesiones totales" />
        </Card>
        <Card className="flex-1" raised>
          <StatNumber value={profile.bodyweightKg ?? "—"} unit="kg" size="sm" color="text-ink" label="Peso actual" />
        </Card>
      </View>

      <SectionHeader title="Peso corporal" action={showWeightForm ? undefined : "Registrar"} onActionPress={() => setShowWeightForm(true)} />
      <Card raised className="mb-6">
        {weightLogs.length > 0 ? (
          <LineChart data={weightLogs.map((l) => ({ x: l.date, y: l.weightKg }))} color={colors.info.DEFAULT} height={140} formatX={(x) => formatDateLong(x).split(" de ")[0]} />
        ) : (
          <Text className="text-ink-dim text-sm font-body">Registra tu peso para ver la evolución aquí.</Text>
        )}
        {showWeightForm ? (
          <View className="flex-row items-end gap-3 mt-4">
            <View className="flex-1">
              <TextField label="Peso" placeholder="75.5" keyboardType="decimal-pad" suffix="kg" value={weightInput} onChangeText={setWeightInput} />
            </View>
            <Button
              label="Guardar"
              size="md"
              onPress={async () => {
                const kg = Number(weightInput);
                if (kg > 0) {
                  await addWeightLog.mutateAsync(kg);
                  setWeightInput("");
                  setShowWeightForm(false);
                }
              }}
            />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Lesiones" action={showInjuryForm ? undefined : "Añadir"} onActionPress={() => setShowInjuryForm(true)} />
      <Card raised className="mb-6">
        {injuries.length === 0 && !showInjuryForm ? (
          <Text className="text-ink-dim text-sm font-body">Sin lesiones registradas. Si tienes alguna molestia, añádela para que el entrenador IA la tenga en cuenta.</Text>
        ) : null}
        <View className="gap-2.5">
          {injuries.map((injury) => (
            <View key={injury.id} className="flex-row items-center justify-between bg-surface rounded-xl px-3.5 py-3">
              <View className="flex-1 pr-2">
                <Text className={`text-sm font-body-semibold ${injury.active ? "text-ink" : "text-ink-faint line-through"}`}>{injury.area}</Text>
                <Text className="text-ink-faint text-xs font-body mt-0.5">{injury.note}</Text>
              </View>
              <Pressable onPress={() => toggleInjury.mutate(injury.id)} hitSlop={8} className="px-2.5 py-1.5">
                <Text className="text-info text-xs font-body-semibold">{injury.active ? "Activa" : "Resuelta"}</Text>
              </Pressable>
              <Pressable onPress={() => deleteInjury.mutate(injury.id)} hitSlop={8} className="pl-1">
                <Feather name="trash-2" size={14} color={colors.danger.DEFAULT} />
              </Pressable>
            </View>
          ))}
        </View>
        {showInjuryForm ? (
          <View className="gap-3 mt-3">
            <TextField label="Zona" placeholder="p. ej. Hombro derecho" value={injuryArea} onChangeText={setInjuryArea} />
            <TextField label="Nota" placeholder="Describe la molestia…" value={injuryNote} onChangeText={setInjuryNote} />
            <Button
              label="Guardar lesión"
              size="md"
              onPress={async () => {
                if (injuryArea.trim()) {
                  await addInjury.mutateAsync({ area: injuryArea.trim(), note: injuryNote.trim() });
                  setInjuryArea("");
                  setInjuryNote("");
                  setShowInjuryForm(false);
                }
              }}
            />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Equipamiento disponible" />
      <View className="flex-row flex-wrap gap-2 mb-6">
        {profile.equipmentAvailable.map((eq) => (
          <Badge key={eq} label={EQUIPMENT_LABEL[eq] ?? eq} tone="neutral" />
        ))}
      </View>

      <SectionHeader title="Sincronización" />
      <Card raised className="mb-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-ink text-sm font-body-semibold">{sync.configured ? "Conectado a la nube" : "Modo local"}</Text>
            <Text className="text-ink-faint text-xs font-body mt-1 leading-4">
              {sync.configured
                ? sync.pending > 0
                  ? `${sync.pending} cambios pendientes de sincronizar`
                  : "Todo sincronizado"
                : "Tus datos se guardan en este dispositivo. Configura Supabase para sincronizar entre dispositivos (ver README)."}
            </Text>
          </View>
          {sync.configured ? <Button label="Sincronizar" size="sm" variant="secondary" loading={sync.syncing} onPress={sync.sync} /> : null}
        </View>
      </Card>

      <SectionHeader title="Cuenta" />
      <Card raised className="mb-10">
        {user ? (
          <Button
            label="Cerrar sesión"
            variant="danger"
            onPress={() => Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [{ text: "Cancelar", style: "cancel" }, { text: "Salir", style: "destructive", onPress: signOut }])}
          />
        ) : (
          <View className="gap-2.5">
            <Text className="text-ink-dim text-sm font-body mb-1">No has iniciado sesión — tus datos siguen seguros en este dispositivo.</Text>
            <Button label="Iniciar sesión / Crear cuenta" onPress={() => router.push("/(auth)/sign-in")} />
          </View>
        )}
      </Card>
    </Screen>
  );
}
