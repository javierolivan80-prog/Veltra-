import { cn } from "@/lib/cn";

type Tone = "progress" | "info" | "ai" | "warn" | "record" | "neutral" | "danger" | "sleep" | "addiction";

const TONE_CLASSES: Record<Tone, string> = {
  progress: "bg-progress-bg text-progress",
  info: "bg-info-bg text-info",
  ai: "bg-ai-bg text-ai",
  warn: "bg-warn-bg text-warn",
  record: "bg-record-bg text-record",
  neutral: "bg-surface-raised text-ink-dim",
  danger: "bg-danger-bg text-danger",
  sleep: "bg-sleep-bg text-sleep",
  addiction: "bg-addiction-bg text-addiction",
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return <span className={cn("inline-block px-2.5 py-1 rounded-full text-xs font-semibold", TONE_CLASSES[tone])}>{label}</span>;
}
