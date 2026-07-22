import { colors } from "@/src/design-system/colors";
import { RANK_META } from "@/src/features/exercises/ranks";
import type { RankTier } from "@/src/types/models";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { RankBadge } from "./RankBadge";

export function RankUpCelebration({
  tier,
  exerciseName,
  onDismiss,
}: {
  tier: RankTier | null;
  exerciseName: string;
  onDismiss: () => void;
}) {
  return (
    <CelebrationOverlay
      visible={!!tier}
      onDismiss={onDismiss}
      accentColor={tier ? colors.rank[tier] : colors.record.DEFAULT}
      eyebrow="Subida de rango"
      title={tier ? `Ahora eres ${RANK_META[tier].label}` : ""}
      subtitle={tier ? `Tu fuerza relativa en ${exerciseName} ha subido de nivel.` : undefined}
      icon={tier ? <RankBadge tier={tier} size="lg" showLabel={false} /> : null}
    />
  );
}
