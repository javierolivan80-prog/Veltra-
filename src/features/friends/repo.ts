import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { requireUserId } from "@/lib/supabase/currentUser";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";

// Comparación social ligera — solo funciona con Supabase configurado: dos
// personas viendo el progreso de la otra es, por definición, algo que no
// puede vivir en el IndexedDB local de cada una. Cada función de aquí
// asume que el caller ya comprobó isSupabaseConfigured (mismo patrón que
// sign-in usa para su propio banner de "no disponible sin la nube").

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L — ambiguos al leerlos a mano
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export interface FriendProgress {
  userId: string;
  displayName: string;
  arcDay: number | null;
  arcDurationDays: number | null;
  streak: number;
  updatedAt: string;
}

/** El código propio, creándolo la primera vez que se pide. */
export async function getMyInviteCode(): Promise<string> {
  const supabase = getSupabaseBrowserClient()!;
  const userId = await requireUserId();

  const { data: existing } = await supabase.from("friend_invites").select("code").eq("user_id", userId).maybeSingle();
  if (existing) return existing.code;

  // Reintenta si el código aleatorio choca con uno ya existente de otro
  // usuario — con 33^6 combinaciones es rarísimo, pero el índice único lo
  // rechazaría igual sin este reintento.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase.from("friend_invites").insert({ code, user_id: userId });
    if (!error) return code;
  }
  throw new Error("No se pudo generar tu código. Inténtalo de nuevo.");
}

/** Añade a la persona propietaria de `code` a tu lista — no requiere que ella apruebe nada. */
export async function redeemInviteCode(code: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()!;
  const viewerId = await requireUserId();
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error("Escribe un código.");

  // RPC en vez de un select directo: friend_invites solo permite leer tu
  // propia fila por RLS, así que resolver el código de otra persona pasa
  // por esta función (security definer) en vez de abrir la tabla entera.
  const { data: targetId, error } = await supabase.rpc("resolve_friend_code", { p_code: normalized });
  if (error) throw error;
  if (!targetId) throw new Error("Ese código no existe. Revísalo e inténtalo de nuevo.");
  if (targetId === viewerId) throw new Error("Ese es tu propio código.");

  const { error: insertError } = await supabase.from("friendships").insert({ viewer_id: viewerId, target_id: targetId });
  if (insertError) {
    if (insertError.code === "23505") throw new Error("Ya has añadido a esta persona.");
    throw insertError;
  }
}

/** Progreso de cada persona a la que has añadido con su código. Quien
 *  nunca ha abierto Hoy desde que se creó su cuenta todavía no tiene fila
 *  en friend_progress — se filtra en vez de mostrar un hueco vacío. */
export async function listFriends(): Promise<FriendProgress[]> {
  const supabase = getSupabaseBrowserClient()!;
  const viewerId = await requireUserId();

  const { data: links } = await supabase.from("friendships").select("target_id").eq("viewer_id", viewerId);
  const targetIds = (links ?? []).map((l: { target_id: string }) => l.target_id);
  if (targetIds.length === 0) return [];

  const { data, error } = await supabase.from("friend_progress").select("*").in("user_id", targetIds);
  if (error || !data) return [];
  const rows: FriendProgress[] = data.map((r: object) => toCamelCase<FriendProgress>(r));
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Sube tu propio progreso — Hoy lo llama cada vez que arcDay/streak cambian. */
export async function pushMyProgress(input: { displayName: string; arcDay: number | null; arcDurationDays: number | null; streak: number }): Promise<void> {
  const supabase = getSupabaseBrowserClient()!;
  const userId = await requireUserId();
  await supabase.from("friend_progress").upsert(
    toSnakeCase({
      userId,
      displayName: input.displayName,
      arcDay: input.arcDay,
      arcDurationDays: input.arcDurationDays,
      streak: input.streak,
      updatedAt: new Date().toISOString(),
    })
  );
}
