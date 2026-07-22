import { Text, View } from "react-native";

type Tone = "progress" | "info" | "ai" | "warn" | "record" | "neutral" | "danger";

const TONE_CLASSES: Record<Tone, { bg: string; text: string }> = {
  progress: { bg: "bg-progress-bg", text: "text-progress" },
  info: { bg: "bg-info-bg", text: "text-info" },
  ai: { bg: "bg-ai-bg", text: "text-ai" },
  warn: { bg: "bg-warn-bg", text: "text-warn" },
  record: { bg: "bg-record-bg", text: "text-record" },
  neutral: { bg: "bg-surface-raised", text: "text-ink-dim" },
  danger: { bg: "bg-danger-bg", text: "text-danger" },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = TONE_CLASSES[tone];
  return (
    <View className={`${t.bg} px-2.5 py-1 rounded-full self-start`}>
      <Text className={`${t.text} text-xs font-body-semibold`}>{label}</Text>
    </View>
  );
}
