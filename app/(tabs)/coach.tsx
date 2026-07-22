import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Card } from "@/src/design-system/components/Card";
import { EmptyState } from "@/src/design-system/components/EmptyState";
import { Screen } from "@/src/design-system/components/Screen";
import { useConversations, useCreateConversation, useDeleteConversation, useRenameConversation, useTogglePinConversation } from "@/src/features/coach/hooks";
import { formatRelativeTime } from "@/src/lib/format";
import type { Conversation } from "@/src/types/models";

export default function CoachListScreen() {
  const [query, setQuery] = useState("");
  const { data: conversations = [] } = useConversations(query);
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const togglePin = useTogglePinConversation();
  const deleteConversation = useDeleteConversation();

  const openConversation = async (id?: string) => {
    if (id) {
      router.push(`/coach/${id}`);
      return;
    }
    const conv = await createConversation.mutateAsync("Nueva conversación");
    router.push(`/coach/${conv.id}`);
  };

  const showActions = (conv: Conversation) => {
    Alert.alert(conv.title, undefined, [
      { text: conv.pinned ? "Desfijar" : "Fijar", onPress: () => togglePin.mutate(conv.id) },
      {
        text: "Renombrar",
        onPress: () =>
          Alert.prompt?.(
            "Renombrar conversación",
            undefined,
            (text) => text && renameConversation.mutate({ id: conv.id, title: text }),
            "plain-text",
            conv.title
          ),
      },
      { text: "Eliminar", style: "destructive", onPress: () => deleteConversation.mutate(conv.id) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <Screen contentClassName="pt-3 pb-32">
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-ink text-2xl font-display">Entrenador IA</Text>
          <Text className="text-ink-dim text-sm font-body mt-0.5">Conoce tu historial completo</Text>
        </View>
        <Pressable onPress={() => openConversation()} className="w-10 h-10 rounded-full bg-ai items-center justify-center">
          <Feather name="edit" size={16} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-row items-center bg-surface border border-line-subtle rounded-2xl px-4 mb-5">
        <Feather name="search" size={15} color={colors.ink.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar conversaciones…"
          placeholderTextColor={colors.ink.faint}
          className="flex-1 text-ink text-base font-body-medium py-3 ml-2.5"
        />
      </View>

      {conversations.length === 0 ? (
        <Card raised>
          <EmptyState
            title="Empieza una conversación"
            description="Pregúntale a tu entrenador sobre tu progreso, tu próxima rutina o cualquier duda — conoce todo tu historial real."
            actionLabel="Nueva conversación"
            onAction={() => openConversation()}
          />
        </Card>
      ) : (
        <View className="gap-2.5">
          {conversations.map((conv) => (
            <Card key={conv.id} onPress={() => openConversation(conv.id)} raised>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5">
                    {conv.pinned ? <Feather name="bookmark" size={12} color={colors.ai.DEFAULT} /> : null}
                    <Text className="text-ink text-base font-body-semibold" numberOfLines={1}>
                      {conv.title}
                    </Text>
                  </View>
                  <Text className="text-ink-faint text-xs font-body mt-1">{formatRelativeTime(conv.updatedAt)}</Text>
                </View>
                <Pressable onPress={() => showActions(conv)} hitSlop={10} className="p-1.5">
                  <Feather name="more-horizontal" size={18} color={colors.ink.faint} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
