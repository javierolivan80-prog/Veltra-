import { MutationCache, QueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/errors";
import { useToastStore } from "@/state/toast.store";

/** Cuánto se conserva una respuesta en caché aunque nadie la pida — más
 *  que el habitual, porque además de acelerar la app es lo que hace que
 *  Hoy tenga algo que enseñar al abrirse sin conexión. */
export const OFFLINE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const DEFAULT_MUTATION_ERROR = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: OFFLINE_CACHE_MAX_AGE_MS,
        retry: false,
      },
    },
    // Red de seguridad para toda la app: sin esto, una mutación que fallaba
    // (red caída, sesión caducada) en cualquiera de los ~60 sitios que
    // guardan algo simplemente no avisaba de nada — el botón parecía no
    // hacer nada y el dato nunca se guardaba. Una pantalla que ya gestiona
    // su propio error (p. ej. mostrándolo inline en el formulario) puede
    // pedir `meta: { silentGlobalError: true }` en su useMutation para no
    // duplicar el aviso.
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (mutation.options.meta?.silentGlobalError) return;
        useToastStore.getState().push(errorMessage(err, DEFAULT_MUTATION_ERROR));
      },
    }),
  });
}
