import { cn } from "@/lib/cn";

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors",
        active ? "bg-info-bg border-info text-info" : "bg-surface border-line-subtle text-ink-dim hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
