import { RANK_META } from "@/features/exercises/ranks";
import type { RankTier } from "@/types/models";

const GRADIENTS: Record<RankTier, [string, string]> = {
  bronze: ["#C67A3E", "#7A4A22"],
  silver: ["#C7CDD6", "#7B8390"],
  gold: ["#F5C453", "#9C6E14"],
  platinum: ["#7FE3D6", "#2E8F86"],
  diamond: ["#8FC7FF", "#3E6FBF"],
  elite: ["#FF4D8D", "#8A1240"],
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
  const [from, to] = GRADIENTS[tier];

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: dims.box,
          height: dims.box,
          background: `linear-gradient(135deg, ${from}, ${to})`,
          boxShadow: `0 0 ${dims.box * 0.45}px ${from}66`,
        }}
      >
        <span style={{ fontSize: dims.emoji }}>{meta.emoji}</span>
      </div>
      {showLabel ? <span className={`font-bold text-ink mt-1.5 ${dims.label}`}>{meta.label}</span> : null}
    </div>
  );
}
