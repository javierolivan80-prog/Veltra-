import { addMemoryFact, addMessage, listMemoryFacts, listMessages } from "@/src/features/coach/repo";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import type { CoachMessage } from "@/src/types/models";
import { buildCoachContext } from "./context";
import { generateLocalCoachReply } from "./localCoach";

const INJURY_KEYWORDS = ["molestia", "molestias", "dolor", "lesion", "lesión", "lesionad"];

async function maybeExtractMemory(userText: string) {
  const norm = userText.toLowerCase();
  if (!INJURY_KEYWORDS.some((k) => norm.includes(k))) return;

  const existing = await listMemoryFacts();
  const alreadyKnown = existing.some((f) => f.content.toLowerCase().includes(norm.slice(0, 20)));
  if (alreadyKnown) return;

  await addMemoryFact(`El usuario mencionó: "${userText.trim()}"`, "injury");
}

/**
 * Calls the deployed `ai-coach` Supabase Edge Function (see
 * supabase/functions/ai-coach) when a project is configured; otherwise (or
 * on any failure) falls back to the deterministic local responder so the
 * chat still works fully offline.
 */
export async function sendCoachMessage(conversationId: string, userText: string): Promise<CoachMessage> {
  await addMessage(conversationId, "user", userText);
  await maybeExtractMemory(userText);

  let replyText: string | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const [history, context] = await Promise.all([listMessages(conversationId), buildCoachContext()]);
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { conversationId, message: userText, history: history.slice(-20), context },
      });
      if (error) throw error;
      if (data?.reply) replyText = data.reply as string;
      for (const fact of data?.memoryFacts ?? []) {
        await addMemoryFact(fact.content, fact.category);
      }
    } catch {
      replyText = null;
    }
  }

  if (!replyText) {
    replyText = await generateLocalCoachReply(userText);
  }

  return addMessage(conversationId, "assistant", replyText);
}
