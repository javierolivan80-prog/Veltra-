import { Link, router } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "@/src/design-system/components/Screen";
import { Logo } from "@/src/design-system/components/Logo";
import { AuthForm } from "@/src/features/auth/AuthForm";

export default function SignUpScreen() {
  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center gap-10">
        <View className="items-center gap-3">
          <Logo />
          <Text className="text-ink-dim text-sm font-body">Crea tu cuenta Veltra</Text>
        </View>

        <AuthForm mode="sign-up" onSuccess={() => router.replace("/(tabs)")} />

        <View className="flex-row justify-center gap-1.5">
          <Text className="text-ink-dim text-sm font-body">¿Ya tienes cuenta?</Text>
          <Link href="/(auth)/sign-in" replace>
            <Text className="text-progress text-sm font-body-semibold">Inicia sesión</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
