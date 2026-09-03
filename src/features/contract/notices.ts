const STORAGE_KEY = "veltra:adaptiveNotices";

/**
 * Cola de avisos del plan adaptativo (Fase 5) — "hemos reducido X a N días
 * por semana". Persistida en localStorage, no en el store dual: es un aviso
 * de una vez para este dispositivo, no un dato del usuario que deba
 * sincronizarse. Sobrevive a un refresco entre que el cambio se aplica y el
 * usuario llega a verlo.
 */
export function pushAdaptiveNotice(text: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, text]));
  } catch {
    // localStorage puede fallar (privado, cuota llena) — se pierde el aviso, no el cambio ya aplicado.
  }
}

/** Lee y vacía la cola — cada aviso se muestra una sola vez. */
export function popAdaptiveNotices(): string[] {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    if (existing.length > 0) localStorage.removeItem(STORAGE_KEY);
    return existing;
  } catch {
    return [];
  }
}
