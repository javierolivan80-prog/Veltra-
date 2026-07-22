import { formatWeight } from "@/lib/format";
import type { PersonalRecord } from "@/types/models";
import { CelebrationOverlay } from "./CelebrationOverlay";

const TYPE_LABEL: Record<PersonalRecord["type"], string> = {
  weight: "Nuevo récord de peso",
  "1rm": "Nuevo récord de 1RM estimado",
  volume: "Nuevo récord de volumen",
  reps: "Nuevo récord de repeticiones",
};

const TYPE_UNIT: Record<PersonalRecord["type"], string> = {
  weight: "kg",
  "1rm": "kg",
  volume: "kg vol.",
  reps: "reps",
};

export function PRCelebration({ record, exerciseName, onDismiss }: { record: PersonalRecord | null; exerciseName: string; onDismiss: () => void }) {
  return (
    <CelebrationOverlay
      open={!!record}
      onDismiss={onDismiss}
      accentColor="#FFC94D"
      eyebrow="Récord personal"
      title={record ? `${formatWeight(record.value)} ${TYPE_UNIT[record.type]}` : ""}
      subtitle={
        record
          ? `${TYPE_LABEL[record.type]} en ${exerciseName}${record.previousValue ? ` · antes ${formatWeight(record.previousValue)} ${TYPE_UNIT[record.type]}` : ""}`
          : undefined
      }
      icon={
        <div className="w-24 h-24 rounded-full bg-record-bg border-2 border-record flex items-center justify-center">
          <span className="text-5xl">🏆</span>
        </div>
      }
    />
  );
}
