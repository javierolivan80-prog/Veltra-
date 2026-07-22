export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-ink text-xl font-display">{title}</h2>
        {subtitle ? <p className="text-ink-dim text-sm mt-0.5">{subtitle}</p> : null}
      </div>
      {action ? (
        <button onClick={onAction} className="text-progress text-sm font-semibold hover:underline">
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-line-subtle my-1" />;
}
