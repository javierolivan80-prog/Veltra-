import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "No encontrado" }} />
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-ink text-xl font-display text-center">Esta pantalla no existe</Text>
        <Link href="/" className="mt-5">
          <Text className="text-progress font-body-semibold">Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}
