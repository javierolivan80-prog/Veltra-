"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  right?: ReactNode;
}

export function Dialog({ open, onOpenChange, title, children, right }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/80 z-[900]" />
        <RadixDialog.Content className="fixed z-[901] inset-x-0 bottom-0 md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-full md:max-w-lg bg-bg-soft border-t md:border border-line-subtle md:rounded-3xl rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden">
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
