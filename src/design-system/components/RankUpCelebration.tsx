import { RANK_META } from "@/features/exercises/ranks";
import type { RankTier } from "@/types/models";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { RankBadge } from "./RankBadge";

const RANK_COLOR: Record<RankTier, string> = {
  bronze: "#C67A3E",
  silver: "#C7CDD6",
  gold: "#F5C453",
  platinum: "#7FE3D6",
  diamond: "#8FC7FF",
  elite: "#FF4D8D",
};

export function RankUpCelebration({ tier, exerciseName, onDismiss }: { tier: RankTier | null; exerciseName: string; onDismiss: () => void }) {
  return (
    <CelebrationOverlay
      open={!!tier}
      onDismiss={onDismiss}
      accentColor={tier ? RANK_COLOR[tier] : "#FFC94D"}
      eyebrow="Subida de rango"
      title={tier ? `Ahora eres ${RANK_META[tier].label}` : ""}
      subtitle={tier ? `Tu fuerza relativa en ${exerciseName} ha subido de nivel.` : undefined}
      icon={tier ? <RankBadge tier={tier} size="lg" showLabel={false} /> : null}
    />
  );
}
