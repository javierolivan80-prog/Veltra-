import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center justify-center py-14 px-6">
      {icon ? <View className="mb-4">{icon}</View> : null}
      <Text className="text-ink text-lg font-display text-center">{title}</Text>
      {description ? <Text className="text-ink-dim text-sm font-body text-center mt-2 leading-5">{description}</Text> : null}
      {actionLabel ? (
        <View className="mt-5">
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
        </View>
      ) : null}
    </View>
  );
}
