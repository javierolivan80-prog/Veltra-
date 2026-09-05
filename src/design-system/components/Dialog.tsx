"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  right?: ReactNode;
}

/** Cuánto tapa el teclado del móvil de la ventana visible ahora mismo — 0 en
 *  desktop o con el teclado cerrado. `interactive-widget=resizes-content`
 *  (ver layout.tsx) ya resuelve esto solo en Chrome/Android; este hook es el
 *  fallback para Safari, que no lo soporta y sigue reportando el viewport de
 *  layout como si el teclado no existiera. Sin esto, un diálogo fijado abajo
 *  con un botón al final del formulario queda tapado por el teclado en
 *  cuanto el usuario escribe algo — inalcanzable, no solo oculto. */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setInset(Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active]);

  return inset;
}

export function Dialog({ open, onOpenChange, title, children, right }: DialogProps) {
  const keyboardInset = useKeyboardInset(open);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/80 z-[900]" />
        <RadixDialog.Content
          style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
          className="fixed z-[901] inset-x-0 bottom-0 md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-full md:max-w-lg bg-bg-soft border-t md:border border-line-subtle md:rounded-3xl rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-line-subtle shrink-0">
            <RadixDialog.Close className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim hover:text-ink">
              <X size={16} />
            </RadixDialog.Close>
            <RadixDialog.Title className="text-ink text-base font-bold">{title}</RadixDialog.Title>
            <div className="w-9 h-9 flex items-center justify-center">{right}</div>
          </div>
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
