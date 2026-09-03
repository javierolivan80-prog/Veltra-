"use client";

import { useSyncExternalStore } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Vive fuera de React a propósito: el navegador puede disparar
// beforeinstallprompt en cualquier momento, incluso antes de que monte el
// componente que lo va a mostrar — así que el listener se engancha en
// cuanto se carga este módulo, no cuando algo lo pide.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<() => void> = [];

function notify() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** El evento diferido, o null si el navegador no lo ha ofrecido (todavía,
 *  o nunca — Safari/iOS no lo soporta). */
export function useDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.push(onChange);
      return () => {
        listeners = listeners.filter((l) => l !== onChange);
      };
    },
    () => deferredPrompt,
    () => null
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
}

/** Ya instalada y abierta como app — no hace falta ofrecerlo. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
