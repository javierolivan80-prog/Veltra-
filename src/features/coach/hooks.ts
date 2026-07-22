import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendCoachMessage } from "@/src/lib/ai/coachClient";
import * as repo from "./repo";

export const coachKeys = {
  conversations: (q?: string) => ["conversations", q ?? ""] as const,
  messages: (id: string) => ["coachMessages", id] as const,
  memory: ["memoryFacts"] as const,
};

export function useConversations(query = "") {
  return useQuery({ queryKey: coachKeys.conversations(query), queryFn: () => repo.listConversations(query || undefined) });
}

export function useMessages(conversationId: string | null) {
  return useQuery({ queryKey: coachKeys.messages(conversationId ?? ""), queryFn: () => repo.listMessages(conversationId!), enabled: !!conversationId });
}

export function useMemoryFacts() {
  return useQuery({ queryKey: coachKeys.memory, queryFn: repo.listMemoryFacts });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => repo.createConversation(title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => repo.renameConversation(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useTogglePinConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.togglePinConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) => sendCoachMessage(conversationId, text),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: coachKeys.messages(variables.conversationId) });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: coachKeys.memory });
    },
  });
}
