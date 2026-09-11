import { CelebrationOverlay } from "./CelebrationOverlay";

/**
 * El momento en que el día queda cumplido del todo. Deliberadamente sobrio:
 * el número que se celebra es la racha real, no puntos ni medallas que la
 * app se invente — si es el primer día, se dice que es el primero, no se
 * disfraza de logro mayor.
 */
export function PlanCelebration({ streak, onDismiss }: { streak: number | null; onDismiss: () => void }) {
  const firstDay = streak !== null && streak <= 1;

  return (
    <CelebrationOverlay
      open={streak !== null}
      onDismiss={onDismiss}
      accentColor="#2ce6a0"
      eyebrow="Plan cumplido"
      title={streak === null ? "" : firstDay ? "Día completo" : `${streak} días seguidos`}
      subtitle={firstDay ? "Has hecho todo lo de hoy. Aquí empieza la racha." : "Has hecho todo lo de hoy sin saltarte un día."}
      icon={
        <div className="w-24 h-24 rounded-full bg-progress-bg border-2 border-progress flex items-center justify-center">
          <span className="text-5xl">🔥</span>
        </div>
      }
      dismissLabel="Seguir"
    />
  );
}
