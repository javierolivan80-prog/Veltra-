import { Pressable, ScrollView, Text, View } from "react-native";

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
    <View>
      {label ? <Text className="text-ink-dim text-sm font-body-medium mb-2">{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`px-4 py-2.5 rounded-full border ${active ? "bg-progress border-progress" : "bg-surface border-line-subtle"}`}
            >
              <Text className={`text-sm font-body-semibold ${active ? "text-bg-deep" : "text-ink-dim"}`}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
