import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireUserId } from "@/lib/supabase/currentUser";

/** Programa la red de seguridad de push real (ver send-rest-alerts) además
 *  del aviso en pantalla que RestTimer ya da. Sin Supabase, o si esto
 *  falla, el temporizador en pantalla sigue siendo la única fuente — nunca
 *  debe romper el flujo de un entrenamiento por esto. */
export async function scheduleRestAlert(id: string, endsAt: number): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("rest_alerts").insert({ id, user_id: userId, ends_at: new Date(endsAt).toISOString() });
  } catch {
    // best-effort
  }
}

/** Cancela un aviso ya programado — al saltar el descanso, registrar otra
 *  serie antes de que termine, o acabar/cancelar la sesión. Sin esto
 *  llegaría un push tardío para un descanso que ya no existe. */
export async function cancelRestAlert(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("rest_alerts").delete().eq("id", id);
  } catch {
    // best-effort
  }
}
