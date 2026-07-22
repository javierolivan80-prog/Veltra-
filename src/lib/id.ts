/** Client-generated id — records created offline need a stable id before they ever reach the server. */
export function generateId(): string {
  return crypto.randomUUID();
}
