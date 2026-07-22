import { Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { formatWeight } from "@/src/lib/format";
import type { PersonalRecord } from "@/src/types/models";
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

export function PRCelebration({
  record,
  exerciseName,
  onDismiss,
}: {
  record: PersonalRecord | null;
  exerciseName: string;
  onDismiss: () => void;
}) {
  return (
    <CelebrationOverlay
      visible={!!record}
      onDismiss={onDismiss}
      accentColor={colors.record.DEFAULT}
      eyebrow="Récord personal"
      title={record ? `${formatWeight(record.value)} ${TYPE_UNIT[record.type]}` : ""}
      subtitle={record ? `${TYPE_LABEL[record.type]} en ${exerciseName}${record.previousValue ? ` · antes ${formatWeight(record.previousValue)} ${TYPE_UNIT[record.type]}` : ""}` : undefined}
      icon={
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.record.bg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: colors.record.DEFAULT,
          }}
        >
          <Text style={{ fontSize: 44 }}>🏆</Text>
        </View>
      }
    />
  );
}
