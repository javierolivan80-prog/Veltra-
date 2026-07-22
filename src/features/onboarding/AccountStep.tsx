import { useState } from "react";
import { Text, View } from "react-native";
import { AuthForm } from "@/src/features/auth/AuthForm";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { Button } from "@/src/design-system/components/Button";

export function AccountStep({ fullName, onDone }: { fullName: string; onDone: () => void }) {
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");

  return (
    <View className="flex-1">
      <View className="mb-6">
        <Text className="text-ink text-2xl font-display">Guarda tu progreso</Text>
        <Text className="text-ink-dim text-sm font-body mt-1 leading-5">
          Crea una cuenta para sincronizar entre dispositivos, o continúa en modo local — tus datos ya están seguros en este dispositivo de todas
          formas.
        </Text>
      </View>

      <View className="flex-1 justify-center gap-6">
        <AuthForm mode={mode} fullName={fullName} onSuccess={onDone} />

        {isSupabaseConfigured ? (
          <Text className="text-center text-ink-dim text-sm font-body">
            {mode === "sign-up" ? "¿Ya tienes cuenta? " : "¿Primera vez aquí? "}
            <Text className="text-progress font-body-semibold" onPress={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}>
              {mode === "sign-up" ? "Inicia sesión" : "Crea una cuenta"}
            </Text>
          </Text>
        ) : null}
      </View>

      <Button label="Continuar en modo local" variant="ghost" onPress={onDone} fullWidth />
    </View>
  );
}
