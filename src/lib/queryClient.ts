import { QueryClient } from "@tanstack/react-query";

/** Cuánto se conserva una respuesta en caché aunque nadie la pida — más
 *  que el habitual, porque además de acelerar la app es lo que hace que
 *  Hoy tenga algo que enseñar al abrirse sin conexión. */
export const OFFLINE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: OFFLINE_CACHE_MAX_AGE_MS,
        retry: false,
      },
    },
  });
}
