import { Minus, Plus } from "lucide-react";

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-ink-faint text-[11px] font-medium mb-1.5 tracking-wide">{label}</span>
      <div className="flex items-center gap-2.5 bg-surface border border-line-subtle rounded-xl px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-dim"
        >
          <Minus size={14} />
        </button>
        <span className="text-ink text-sm font-bold w-12 text-center tabular-nums">{format ? format(value) : value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-dim"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
