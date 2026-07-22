import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Button } from "@/src/design-system/components/Button";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "trending-up" as const,
    accent: colors.progress.DEFAULT,
    title: "Disfruta viendo cómo progresas",
    body: "Veltra no es una app para apuntar entrenamientos. Es la sensación de ver tu progreso, semana tras semana.",
  },
  {
    icon: "zap" as const,
    accent: colors.info.DEFAULT,
    title: "Registra una serie en menos de 3 segundos",
    body: "Abre tu rutina y pulsa el ejercicio actual. Veltra recuerda tu peso, tus repeticiones y tu descanso.",
  },
  {
    icon: "cpu" as const,
    accent: colors.ai.DEFAULT,
    title: "Tu entrenador personal con IA",
    body: "Conoce tu historial, tus lesiones y tus objetivos reales — y celebra contigo cada récord y cada subida de rango.",
  },
];

export function IntroCarousel({ onFinish }: { onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    } else {
      onFinish();
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={{ width }} className="flex-1 items-center justify-center px-9">
            <LinearGradient
              colors={[`${slide.accent}33`, "transparent"]}
              style={{ width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", marginBottom: 36 }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.surface.DEFAULT,
                  borderWidth: 1,
                  borderColor: colors.line.DEFAULT,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={slide.icon} size={40} color={slide.accent} />
              </View>
            </LinearGradient>
            <Text className="text-ink text-3xl font-display text-center leading-9">{slide.title}</Text>
            <Text className="text-ink-dim text-base font-body text-center mt-4 leading-6">{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="px-8 pb-4">
        <View className="flex-row justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 22 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === page ? SLIDES[page].accent : colors.line.DEFAULT,
              }}
            />
          ))}
        </View>
        <Button label={page === SLIDES.length - 1 ? "Comenzar" : "Continuar"} onPress={goNext} fullWidth size="lg" />
      </View>
    </View>
  );
}
