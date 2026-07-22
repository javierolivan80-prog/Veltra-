import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
  xl: "text-7xl",
};

interface StatNumberProps {
  value: string | number;
  unit?: string;
  label?: string;
  size?: Size;
  color?: string; // NativeWind text color class, e.g. "text-progress"
  trend?: { direction: "up" | "down" | "flat"; label: string };
}

export function StatNumber({ value, unit, label, size = "lg", color = "text-ink", trend }: StatNumberProps) {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    opacity.value = withSpring(1, { damping: 20 });
  }, [value]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const trendColor = trend?.direction === "up" ? "text-progress" : trend?.direction === "down" ? "text-danger" : "text-ink-faint";

  return (
    <View>
      <Animated.View style={style} className="flex-row items-baseline gap-1.5">
        <Text className={`${SIZE_CLASSES[size]} font-display ${color} tracking-tight`}>{value}</Text>
        {unit ? <Text className={`text-base font-body-medium text-ink-dim mb-1`}>{unit}</Text> : null}
      </Animated.View>
      {label ? <Text className="text-sm font-body-medium text-ink-dim mt-1">{label}</Text> : null}
      {trend ? (
        <Text className={`text-xs font-body-semibold ${trendColor} mt-0.5`}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
        </Text>
      ) : null}
    </View>
  );
}
