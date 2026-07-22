import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { useConversations, useMessages, useSendMessage } from "@/src/features/coach/hooks";
import { formatRelativeTime } from "@/src/lib/format";
import type { CoachMessage } from "@/src/types/models";

const QUICK_PROMPTS = [
  "¿Qué peso debería usar hoy?",
  "Analiza mi entrenamiento reciente",
  "¿Qué músculo llevo más atrasado?",
  "¿Estoy haciendo demasiado volumen?",
];

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "user";
  return (
    <View className={`mb-3 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}>
      <View className={`px-4 py-3 rounded-2xl ${isUser ? "bg-progress rounded-br-md" : "bg-surface-raised border border-line-subtle rounded-bl-md"}`}>
        <Text className={`text-[15px] font-body leading-5 ${isUser ? "text-bg-deep" : "text-ink"}`}>{message.content}</Text>
      </View>
      <Text className={`text-ink-faint text-[10px] font-body mt-1 ${isUser ? "text-right" : ""}`}>{formatRelativeTime(message.createdAt)}</Text>
    </View>
  );
}

export default function CoachChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { data: conversations = [] } = useConversations();
  const { data: messages = [] } = useMessages(conversationId ?? null);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  const send = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !conversationId) return;
    setText("");
    await sendMessage.mutateAsync({ conversationId, text: trimmed });
  };

  if (!conversationId) return <View className="flex-1 bg-bg" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-bg" keyboardVerticalOffset={90}>
      <View className="flex-1 bg-bg pt-14 px-5">
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable onPress={() => router.back()} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
            <Feather name="chevron-left" size={18} color={colors.ink.dim} />
          </Pressable>
          <View className="w-8 h-8 rounded-full bg-ai/20 items-center justify-center">
            <Feather name="cpu" size={14} color={colors.ai.DEFAULT} />
          </View>
          <Text className="text-ink text-base font-body-bold flex-1" numberOfLines={1}>
            {conversation?.title ?? "Entrenador IA"}
          </Text>
        </View>

        {messages.length === 0 ? (
          <View className="flex-1 justify-end pb-4">
            <Text className="text-ink-dim text-sm font-body mb-3">Prueba a preguntar:</Text>
            <View className="gap-2">
              {QUICK_PROMPTS.map((p) => (
                <Pressable key={p} onPress={() => send(p)} className="bg-surface border border-line-subtle rounded-2xl px-4 py-3">
                  <Text className="text-ink-dim text-sm font-body-medium">{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={{ paddingBottom: 12, flexGrow: 1, justifyContent: "flex-end" }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {sendMessage.isPending ? (
          <View className="flex-row items-center gap-2 mb-2">
            <ActivityIndicator size="small" color={colors.ai.DEFAULT} />
            <Text className="text-ink-faint text-xs font-body">Tu entrenador está escribiendo…</Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-2.5 pb-6 pt-2">
          <View className="flex-1 bg-surface border border-line-subtle rounded-full px-4 py-1">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Pregunta algo a tu entrenador…"
              placeholderTextColor={colors.ink.faint}
              multiline
              className="text-ink text-[15px] font-body-medium py-2.5 max-h-24"
            />
          </View>
          <Pressable
            onPress={() => send(text)}
            disabled={!text.trim() || sendMessage.isPending}
            className="w-11 h-11 rounded-full bg-ai items-center justify-center"
            style={{ opacity: !text.trim() || sendMessage.isPending ? 0.4 : 1 }}
          >
            <Feather name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
