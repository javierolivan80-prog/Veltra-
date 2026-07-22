import { Pressable, Text } from "react-native";

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`px-3.5 py-2 rounded-xl border ${active ? "bg-info-bg border-info" : "bg-surface border-line-subtle"}`}>
      <Text className={`text-sm font-body-semibold ${active ? "text-info" : "text-ink-dim"}`}>{label}</Text>
    </Pressable>
  );
}
