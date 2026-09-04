"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isIos, isStandalone, useDeferredInstallPrompt } from "./installPrompt";

const DISMISSED_KEY = "veltra:installPromptDismissed";

/**
 * Prompt de instalación — nunca antes de completar el primer día. El
 * llamador decide `eligible` (ver dashboard/page.tsx: día 2 del arco en
 * adelante); este componente solo decide CÓMO ofrecerlo una vez toca:
 * el prompt nativo si el navegador lo soporta (Chrome/Edge/Android),
 * instrucciones manuales en iOS (Safari no dispara beforeinstallprompt),
 * nada en cualquier otro caso.
 */
export function InstallPrompt({ eligible }: { eligible: boolean }) {
  const deferredPrompt = useDeferredInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setStandalone(isStandalone());
      setIos(isIos());
      try {
        if (localStorage.getItem(DISMISSED_KEY) === "1") setDismissed(true);
      } catch {
        // localStorage no disponible — nunca se marca como descartado, no rompe nada.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Se pierde la preferencia, no la funcionalidad — puede volver a aparecer.
    }
  };

  if (!eligible || dismissed || standalone || (!deferredPrompt && !ios)) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  };

  return (
    <div className="flex items-start gap-3 border border-line-subtle rounded-2xl bg-surface px-4 py-3.5">
      <span className="w-9 h-9 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
        <Download size={16} className="text-progress" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-semibold">Instala Veltra</p>
        <p className="text-ink-faint text-xs mt-0.5">
          {deferredPrompt ? "Acceso directo, sin la barra del navegador." : "Toca Compartir y luego “Añadir a pantalla de inicio”."}
        </p>
      </div>
      {deferredPrompt ? (
        <button onClick={install} className="text-progress text-sm font-semibold shrink-0">
          Instalar
        </button>
      ) : null}
      <button onClick={dismiss} className="text-ink-faint shrink-0" aria-label="Descartar">
        <X size={14} />
      </button>
    </div>
  );
}
