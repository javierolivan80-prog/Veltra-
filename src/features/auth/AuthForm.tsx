import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/src/design-system/components/Button";
import { TextField } from "@/src/design-system/components/TextField";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { useAuthStore } from "@/src/state/auth.store";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode, fullName, onSuccess }: { mode: Mode; fullName?: string; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, loading } = useAuthStore();

  const submit = async () => {
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Introduce un email válido y una contraseña de al menos 6 caracteres.");
      return;
    }
    const result = mode === "sign-up" ? await signUp(email.trim(), password, fullName ?? "") : await signIn(email.trim(), password);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error ?? "Ha ocurrido un error.");
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <View className="bg-warn-bg border border-warn/30 rounded-2xl p-4">
        <Text className="text-warn text-sm font-body-semibold">Inicio de sesión en la nube no disponible</Text>
        <Text className="text-ink-dim text-sm font-body mt-1.5 leading-5">
          Este entorno todavía no tiene un proyecto Supabase configurado. El sistema de cuentas está completamente implementado y listo — en
          cuanto se añadan las claves (ver README), el registro y el inicio de sesión funcionarán aquí mismo.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <TextField label="Email" placeholder="tú@email.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextField label="Contraseña" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text className="text-danger text-sm font-body-medium">{error}</Text> : null}
      <Button label={mode === "sign-up" ? "Crear cuenta" : "Iniciar sesión"} onPress={submit} loading={loading} fullWidth size="lg" />
    </View>
  );
}
