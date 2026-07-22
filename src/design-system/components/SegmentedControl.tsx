import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label ? <p className="text-ink-dim text-sm font-medium mb-2">{label}</p> : null}
      <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-fade-x pb-1 pr-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-4 py-2.5 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors",
                active ? "bg-progress border-progress text-bg-deep" : "bg-surface border-line-subtle text-ink-dim hover:text-ink"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
