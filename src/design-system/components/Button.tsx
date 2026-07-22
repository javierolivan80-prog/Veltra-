import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
}

const VARIANT_STYLES: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-progress", text: "text-bg-deep" },
  secondary: { container: "bg-surface-raised border border-line", text: "text-ink" },
  ghost: { container: "bg-transparent", text: "text-ink-dim" },
  danger: { container: "bg-danger", text: "text-white" },
  ai: { container: "bg-ai", text: "text-white" },
};

const SIZE_STYLES: Record<Size, { container: string; text: string }> = {
  sm: { container: "px-3.5 py-2 rounded-xl", text: "text-sm font-body-semibold" },
  md: { container: "px-5 py-3.5 rounded-2xl", text: "text-base font-body-semibold" },
  lg: { container: "px-6 py-4 rounded-2xl", text: "text-lg font-body-bold" },
};

export function Button({ label, onPress, variant = "primary", size = "md", icon, disabled, loading, fullWidth, haptic = true }: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      className={`${v.container} ${s.container} ${fullWidth ? "w-full" : ""} flex-row items-center justify-center gap-2`}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : disabled ? 0.45 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#0B0B0B" : "#F5F5F7"} />
      ) : (
        <>
          {icon}
          <Text className={`${v.text} ${s.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
