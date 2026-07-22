import * as Crypto from "expo-crypto";

/** Client-generated UUID v4 — records created offline need a stable id before they ever reach the server. */
export function generateId(): string {
  return Crypto.randomUUID();
}
