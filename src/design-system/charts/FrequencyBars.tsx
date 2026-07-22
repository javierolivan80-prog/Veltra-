import { Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";

export function FrequencyBars({ weeks, labels }: { weeks: number[]; labels: string[] }) {
  const max = Math.max(1, ...weeks);
  return (
    <View className="flex-row items-end justify-between h-24 px-1">
      {weeks.map((count, i) => (
        <View key={i} className="items-center flex-1">
          <Text className="text-ink-dim text-[10px] font-body-semibold mb-1">{count > 0 ? count : ""}</Text>
          <View
            style={{
              width: 14,
              height: Math.max(4, (count / max) * 56),
              borderRadius: 7,
              backgroundColor: count > 0 ? colors.info.DEFAULT : colors.line.DEFAULT,
            }}
          />
          <Text className="text-ink-faint text-[9px] font-body mt-1.5">{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}
