import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { colors } from "@/src/design-system/colors";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1200 }), withTiming(0.6, { duration: 1200 })), -1, true);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const textSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const dotSize = size === "lg" ? 10 : size === "sm" ? 5 : 7;

  return (
    <View className="flex-row items-center gap-2">
      <Text className={`${textSize} font-display text-ink tracking-[2px]`}>VELTRA</Text>
      <Animated.View style={[{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: colors.progress.DEFAULT }, dotStyle]} />
    </View>
  );
}
