import { Pressable, Text, View } from "react-native";

export function SectionHeader({
  title,
  subtitle,
  action,
  onActionPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onActionPress?: () => void;
}) {
  return (
    <View className="flex-row items-end justify-between mb-4">
      <View>
        <Text className="text-ink text-xl font-display">{title}</Text>
        {subtitle ? <Text className="text-ink-dim text-sm font-body mt-0.5">{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text className="text-progress text-sm font-body-semibold">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View className="h-px bg-line-subtle my-1" />;
}

