import type { PhysiquePose } from "@/types/models";

/** Instrucción concreta de cómo colocarse para cada pose — se muestra junto
 *  al pictograma en el diálogo de subida. La consistencia entre semanas
 *  (mismo ángulo, misma pose) es lo que más mejora la fiabilidad del
 *  análisis de la IA, así que esto no es decorativo. */
export const POSE_INSTRUCTIONS: Record<PhysiquePose, string> = {
  baseline: "De pie, de frente a la cámara, brazos relajados a los lados. Postura natural, sin tensar.",
  back_lats: "De espaldas a la cámara, manos en la cintura y codos abiertos hacia fuera para separar los dorsales.",
  front_double_biceps: "De frente, ambos brazos arriba flexionando bíceps — codos a la altura del hombro, puños hacia la cabeza.",
  back_double_biceps: "De espaldas, la misma doble flexión de bíceps que de frente — codos altos, espalda contraída.",
  side_triceps: "De perfil, el brazo más cercano a la cámara extendido hacia atrás y flexionando el tríceps.",
};

/** Consejos generales de calidad de foto — comunes a las 5 poses. Aplicarlos
 *  es lo que permite que el rango de grasa corporal sea estrecho en vez de
 *  ensancharse por mala luz o encuadre inconsistente (ver el prompt de la IA
 *  en supabase/functions/ai-coach). */
export const PHOTO_QUALITY_TIPS = [
  "Luz natural y uniforme, sin flash directo ni contraluz",
  "Cámara a la altura del pecho, 2-3 metros de distancia",
  "Fondo liso y ropa ajustada (o sin camiseta)",
  "Misma hora del día cada semana, para que las fotos sean comparables",
];

const HEAD = { cx: 30, cy: 10, r: 7 };
const HIP = { x: 30, y: 50 };

function Skeleton({ backFlare, legs = true }: { backFlare?: boolean; legs?: boolean }) {
  return (
    <>
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="currentColor" />
      <line x1={30} y1={17} x2={HIP.x} y2={HIP.y} strokeWidth={4} strokeLinecap="round" />
      {legs ? (
        <>
          <line x1={HIP.x} y1={HIP.y} x2={19} y2={86} strokeWidth={4} strokeLinecap="round" />
          <line x1={HIP.x} y1={HIP.y} x2={41} y2={86} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : null}
      {backFlare ? (
        <>
          <line x1={25} y1={38} x2={13} y2={33} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
          <line x1={35} y1={38} x2={47} y2={33} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        </>
      ) : null}
    </>
  );
}

const ARM_PROPS = { fill: "none", strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Pictograma esquemático (no anatómico) por pose: la silueta base es igual
 *  en las 5, solo cambia la posición de los brazos — que es exactamente lo
 *  que el usuario tiene que replicar cada semana. */
function PoseIcon({ pose }: { pose: PhysiquePose }) {
  switch (pose) {
    case "baseline":
      return (
        <g stroke="currentColor">
          <Skeleton />
          <polyline points="30,20 17,35 14,52" {...ARM_PROPS} />
          <polyline points="30,20 43,35 46,52" {...ARM_PROPS} />
        </g>
      );
    case "back_lats":
      return (
        <g stroke="currentColor">
          <Skeleton backFlare />
          <polyline points="30,22 10,32 22,48" {...ARM_PROPS} />
          <polyline points="30,22 50,32 38,48" {...ARM_PROPS} />
        </g>
      );
    case "front_double_biceps":
      return (
        <g stroke="currentColor">
          <Skeleton />
          <polyline points="30,20 10,18 16,3" {...ARM_PROPS} />
          <polyline points="30,20 50,18 44,3" {...ARM_PROPS} />
        </g>
      );
    case "back_double_biceps":
      return (
        <g stroke="currentColor">
          <Skeleton backFlare />
          <polyline points="30,20 10,18 16,3" {...ARM_PROPS} />
          <polyline points="30,20 50,18 44,3" {...ARM_PROPS} />
        </g>
      );
    case "side_triceps":
      return (
        <g stroke="currentColor">
          <circle cx={34} cy={HEAD.cy} r={HEAD.r} fill="currentColor" />
          <line x1={32} y1={17} x2={28} y2={50} strokeWidth={4} strokeLinecap="round" />
          <line x1={28} y1={50} x2={24} y2={86} strokeWidth={4} strokeLinecap="round" />
          <line x1={28} y1={50} x2={37} y2={84} strokeWidth={4} strokeLinecap="round" />
          <polyline points="31,21 17,28 13,45" {...ARM_PROPS} />
          <line x1={30} y1={22} x2={26} y2={35} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
        </g>
      );
  }
}

export function PoseGuide({ pose }: { pose: PhysiquePose }) {
  return (
    <div className="flex items-center gap-3.5 bg-surface rounded-2xl p-3.5 border border-line-subtle">
      <svg viewBox="0 0 60 90" className="w-12 h-[72px] text-ink-dim shrink-0" aria-hidden>
        <PoseIcon pose={pose} />
      </svg>
      <div className="min-w-0">
        <p className="text-ink text-xs font-semibold leading-4">{POSE_INSTRUCTIONS[pose]}</p>
      </div>
    </div>
  );
}
