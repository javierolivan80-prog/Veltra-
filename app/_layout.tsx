import "../global.css";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDb } from "@/src/lib/db/client";
import { queryClient } from "@/src/lib/queryClient";
import { initSyncOnReconnect, runSync } from "@/src/lib/sync/syncEngine";
import { useAuthStore } from "@/src/state/auth.store";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true));
    initAuth();
    const unsubscribe = initSyncOnReconnect();
    runSync();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && dbReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, dbReady]);

  if (!(fontsLoaded || fontError) || !dbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: "#0B0B0B" } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout/[sessionId]" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="routine/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="exercise/picker" options={{ presentation: "modal" }} />
            <Stack.Screen name="exercise/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="exercise/[exerciseId]/edit" options={{ presentation: "modal" }} />
            <Stack.Screen name="profile/edit" options={{ presentation: "modal" }} />
            <Stack.Screen name="coach/[conversationId]" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
