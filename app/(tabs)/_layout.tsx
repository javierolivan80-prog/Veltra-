import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/src/design-system/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.progress.DEFAULT,
        tabBarInactiveTintColor: colors.ink.faint,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: -2 },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Platform.OS === "ios" ? 28 : 16,
          height: 68,
          borderRadius: 28,
          backgroundColor: "rgba(21,21,21,0.96)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.line.subtle,
          paddingTop: 10,
          paddingBottom: 10,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: ({ color, size }) => <Feather name="home" size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="routines"
        options={{ title: "Rutinas", tabBarIcon: ({ color, size }) => <Feather name="list" size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: "Coach IA", tabBarIcon: ({ color, size }) => <Feather name="cpu" size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Feather name="user" size={size - 2} color={color} /> }}
      />
    </Tabs>
  );
}
