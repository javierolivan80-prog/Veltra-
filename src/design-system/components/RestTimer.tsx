import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { useWorkoutSessionStore } from "@/src/state/workoutSession.store";
import { formatDuration } from "@/src/lib/format";
import { ProgressRing } from "./ProgressRing";

export function RestTimer() {
  const restTimer = useWorkoutSessionStore((s) => s.restTimer);
  const clearRest = useWorkoutSessionStore((s) => s.clearRest);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!restTimer.endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [restTimer.endsAt]);

  useEffect(() => {
    if (restTimer.endsAt && restTimer.endsAt <= now) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearRest();
    }
  }, [now, restTimer.endsAt]);

  if (!restTimer.endsAt) return null;

  const remainingMs = Math.max(0, restTimer.endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = restTimer.durationSeconds > 0 ? remainingMs / 1000 / restTimer.durationSeconds : 0;

  return (
    <View className="flex-row items-center justify-between bg-info-bg border border-info/25 rounded-2xl px-4 py-3 mb-4">
      <View className="flex-row items-center gap-3">
        <ProgressRing progress={1 - progress} size={40} strokeWidth={4} color={colors.info.DEFAULT} trackColor="#132844">
          <Feather name="clock" size={14} color={colors.info.DEFAULT} />
        </ProgressRing>
        <View>
          <Text className="text-info text-lg font-display">{formatDuration(remainingSec)}</Text>
          <Text className="text-ink-dim text-xs font-body">Descanso</Text>
        </View>
      </View>
      <Pressable onPress={clearRest} className="px-3.5 py-2 rounded-full bg-surface-raised">
        <Text className="text-ink-dim text-xs font-body-semibold">Saltar</Text>
      </Pressable>
    </View>
  );
}
