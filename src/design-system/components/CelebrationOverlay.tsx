import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Button } from "./Button";

interface CelebrationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  eyebrow: string;
  title: string;
  subtitle?: string;
  accentColor: string;
  icon: React.ReactNode;
}

function Particle({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);
  const angle = useMemo(() => (index / 14) * Math.PI * 2 + Math.random() * 0.4, [index]);
  const distance = useMemo(() => 90 + Math.random() * 70, [index]);

  useEffect(() => {
    progress.value = withDelay(index * 12, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, []);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(angle) * distance * progress.value;
    const y = Math.sin(angle) * distance * progress.value - 40 * progress.value;
    return {
      position: "absolute",
      opacity: 1 - progress.value,
      transform: [{ translateX: x }, { translateY: y }, { scale: 1 - progress.value * 0.5 }],
    };
  });

  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, style]} />;
}

export function CelebrationOverlay({ visible, onDismiss, eyebrow, title, subtitle, accentColor, icon }: CelebrationOverlayProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSequence(withSpring(1.08, { damping: 9, stiffness: 160 }), withSpring(1, { damping: 12 }));
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      scale.value = 0.6;
      opacity.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 24 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents="auto">
        <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill} className="bg-black/85" />
        <View style={StyleSheet.absoluteFill} className="items-center justify-center px-8" pointerEvents="box-none">
          <Animated.View style={cardStyle} className="items-center w-full">
            <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <Particle key={i} index={i} color={accentColor} />
              ))}
              {icon}
            </View>
            <Text className="text-ink-dim text-xs font-body-bold tracking-[3px] uppercase mt-6">{eyebrow}</Text>
            <Text className="text-ink text-3xl font-display text-center mt-2">{title}</Text>
            {subtitle ? <Text className="text-ink-dim text-base font-body text-center mt-2 leading-6">{subtitle}</Text> : null}
            <View className="mt-8 w-full">
              <Button label="Seguir entrenando" onPress={onDismiss} fullWidth />
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
