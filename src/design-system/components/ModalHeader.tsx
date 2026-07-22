import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";

export function ModalHeader({ title, onClose, right }: { title: string; onClose: () => void; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between mb-5">
      <Pressable onPress={onClose} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
        <Feather name="x" size={16} color={colors.ink.dim} />
      </Pressable>
      <Text className="text-ink text-base font-body-bold">{title}</Text>
      <View className="w-9 h-9 items-center justify-center">{right}</View>
    </View>
  );
}
