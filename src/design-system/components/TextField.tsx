import { Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label?: string;
  suffix?: string;
}

export function TextField({ label, suffix, ...rest }: TextFieldProps) {
  return (
    <View>
      {label ? <Text className="text-ink-dim text-sm font-body-medium mb-2">{label}</Text> : null}
      <View className="flex-row items-center bg-surface border border-line-subtle rounded-2xl px-4">
        <TextInput
          placeholderTextColor="#6B6B72"
          className="flex-1 text-ink text-base font-body-medium py-3.5"
          {...rest}
        />
        {suffix ? <Text className="text-ink-faint text-sm font-body-medium ml-2">{suffix}</Text> : null}
      </View>
    </View>
  );
}
