import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  return (
    <View className="items-center">
      <Text className="text-ink-faint text-[11px] font-body-medium mb-1.5">{label}</Text>
      <View className="flex-row items-center gap-2.5 bg-surface border border-line-subtle rounded-xl px-1.5 py-1.5">
        <Pressable onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} hitSlop={6} className="w-7 h-7 items-center justify-center">
          <Feather name="minus" size={14} color={colors.ink.dim} />
        </Pressable>
        <Text className="text-ink text-sm font-body-bold w-10 text-center">{format ? format(value) : value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))} hitSlop={6} className="w-7 h-7 items-center justify-center">
          <Feather name="plus" size={14} color={colors.ink.dim} />
        </Pressable>
      </View>
    </View>
  );
}
