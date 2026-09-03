"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: "bg-progress text-bg-deep hover:bg-progress/90",
  secondary: "bg-surface-raised border border-line text-ink hover:bg-surface-hover",
  ghost: "bg-transparent text-ink-dim hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "px-3.5 py-2 rounded-xl text-sm font-semibold",
  md: "px-5 py-3.5 rounded-2xl text-base font-semibold",
  lg: "px-6 py-4 rounded-2xl text-lg font-bold",
};

export function Button({ label, onClick, type = "button", variant = "primary", size = "md", icon, disabled, loading, fullWidth }: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={cn(
        "font-display flex items-center justify-center gap-2 transition-colors disabled:opacity-45 disabled:cursor-not-allowed",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth && "w-full"
      )}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </motion.button>
  );
}
