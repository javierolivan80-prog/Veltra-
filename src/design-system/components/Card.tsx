"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  raised?: boolean;
  className?: string;
}

export function Card({ children, onClick, raised, className }: CardProps) {
  const base = cn("rounded-3xl border border-line-subtle p-5", raised ? "bg-surface-raised" : "bg-surface", className);

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        whileHover={{ borderColor: "var(--color-line)" }}
        className={cn(base, "text-left w-full cursor-pointer")}
      >
        {children}
      </motion.button>
    );
  }

  return <div className={base}>{children}</div>;
}
