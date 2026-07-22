import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { RANK_META } from "@/src/features/exercises/ranks";
import type { RankTier } from "@/src/types/models";

const GRADIENTS: Record<RankTier, [string, string]> = {
  bronze: [colors.rank.bronze, "#7A4A22"],
  silver: [colors.rank.silver, "#7B8390"],
  gold: [colors.rank.gold, "#9C6E14"],
  platinum: [colors.rank.platinum, "#2E8F86"],
  diamond: [colors.rank.diamond, "#3E6FBF"],
  elite: [colors.rank.elite, "#8A1240"],
};

type Size = "sm" | "md" | "lg";
const SIZES: Record<Size, { box: number; emoji: number; label: string }> = {
  sm: { box: 36, emoji: 16, label: "text-[10px]" },
  md: { box: 56, emoji: 24, label: "text-xs" },
  lg: { box: 96, emoji: 40, label: "text-base" },
};

export function RankBadge({ tier, size = "md", showLabel = true }: { tier: RankTier; size?: Size; showLabel?: boolean }) {
  const meta = RANK_META[tier];
  const dims = SIZES[size];
  return (
    <View className="items-center">
      <LinearGradient
        colors={GRADIENTS[tier]}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          width: dims.box,
          height: dims.box,
          borderRadius: dims.box / 2,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: GRADIENTS[tier][0],
          shadowOpacity: 0.55,
          shadowRadius: dims.box * 0.35,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: dims.emoji }}>{meta.emoji}</Text>
      </LinearGradient>
      {showLabel ? <Text className={`${dims.label} font-body-bold text-ink mt-1.5`}>{meta.label}</Text> : null}
    </View>
  );
}
