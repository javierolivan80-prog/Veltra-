"use client";

import { useEffect } from "react";
import { isServiceWorkerSupported, registerServiceWorker } from "@/lib/notifications/push";

/**
 * Registra el service worker en cuanto carga la app, sin pedir permiso de
 * nada — es lo que le da a Hoy un shell disponible sin conexión (Fase 7).
 * Independiente de si el usuario activa alguna vez las notificaciones push:
 * ese es un opt-in aparte (ver Hábitos), esto no lo es.
 */
export function useRegisterServiceWorker() {
  useEffect(() => {
    if (!isServiceWorkerSupported()) return;
    registerServiceWorker().catch(() => {
      // Sin service worker no hay shell offline, pero el resto de la app
      // sigue funcionando con conexión — no es un fallo que deba interrumpir nada.
    });
  }, []);
}
