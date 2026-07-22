import type { ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
  scrollProps?: ScrollViewProps;
}

export function Screen({ children, scroll = true, edges = ["top", "bottom"], className, contentClassName, scrollProps }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-bg ${className ?? ""}`}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`px-5 pb-12 ${contentClassName ?? ""}`}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 px-5 ${contentClassName ?? ""}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
