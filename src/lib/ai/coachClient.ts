import { addMemoryFact, addMessage, listMemoryFacts, listMessages } from "@/features/coach/repo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CoachMessage } from "@/types/models";
import { buildCoachContext } from "./context";
import { generateLocalCoachReply } from "./localCoach";

const INJURY_KEYWORDS = ["molestia", "molestias", "dolor", "lesion", "lesión", "lesionad"];

// Deployed via the Supabase dashboard editor, which auto-assigned this slug
// instead of "ai-coach" — the name is arbitrary, only the deployed code matters.
const AI_COACH_FUNCTION_NAME = "bright-function";

// TEMP DIAGNOSTIC — remove once the edge function is confirmed working.
async function describeInvokeError(err: unknown): Promise<string> {
  const context = (err as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return `${String(body.error)} (HTTP ${context.status})`;
    } catch {
      // not JSON — fall through
    }
    try {
      const text = await context.text();
      if (text) return `${text} (HTTP ${context.status})`;
    } catch {
      // ignore
    }
    return `HTTP ${context.status}`;
  }
  return err instanceof Error ? err.message : String(err);
}

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
 * chat still works fully without a live backend.
 */
export async function sendCoachMessage(conversationId: string, userText: string): Promise<CoachMessage> {
  await addMessage(conversationId, "user", userText);
  await maybeExtractMemory(userText);

  let replyText: string | null = null;
  let debugError: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseBrowserClient()!;
      const [history, context] = await Promise.all([listMessages(conversationId), buildCoachContext()]);
      const { data, error } = await supabase.functions.invoke(AI_COACH_FUNCTION_NAME, {
        body: { conversationId, message: userText, history: history.slice(-20), context },
      });
      if (error) throw error;
      if (data?.reply) {
        replyText = data.reply as string;
      } else {
        // TEMP DIAGNOSTIC — the function responded without throwing, but
        // the body had no usable `reply`. Show exactly what came back.
        debugError = `Respuesta sin "reply": ${JSON.stringify(data)}`;
      }
      for (const fact of data?.memoryFacts ?? []) {
        await addMemoryFact(fact.content, fact.category);
      }
    } catch (err) {
      replyText = null;
      // TEMP DIAGNOSTIC — remove once the edge function is confirmed working.
      // Surfaces the real failure reason instead of silently falling back.
      debugError = await describeInvokeError(err);
    }
  }

  if (!replyText) {
    replyText = await generateLocalCoachReply(userText);
    if (debugError) {
      replyText = `⚠️ [debug ai-coach] ${debugError}\n\n${replyText}`;
    }
  }

  return addMessage(conversationId, "assistant", replyText);
}
