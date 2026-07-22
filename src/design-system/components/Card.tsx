import type { ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: ReactNode;
  onPress?: () => void;
  raised?: boolean;
  className?: string;
}

export function Card({ children, onPress, raised, className, ...rest }: CardProps) {
  const base = `rounded-3xl border border-line-subtle ${raised ? "bg-surface-raised" : "bg-surface"} p-5`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${base} ${className ?? ""}`}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        {...(rest as any)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`${base} ${className ?? ""}`} {...rest}>
      {children}
    </View>
  );
}
