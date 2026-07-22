import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { getProfile } from "@/src/features/profile/repo";
import { Logo } from "@/src/design-system/components/Logo";

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((profile) => setTarget(profile ? "/(tabs)" : "/onboarding"))
      .catch(() => setTarget("/onboarding"));
  }, []);

  if (!target) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Logo />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
