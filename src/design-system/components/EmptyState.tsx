import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {icon ? <div className="mb-4">{icon}</div> : null}
      <p className="text-ink text-lg font-display">{title}</p>
      {description ? <p className="text-ink-dim text-sm mt-2 leading-5 max-w-sm">{description}</p> : null}
      {actionLabel ? (
        <div className="mt-5">
          <Button label={actionLabel} onClick={onAction} variant="secondary" size="sm" />
        </div>
      ) : null}
    </div>
  );
}
