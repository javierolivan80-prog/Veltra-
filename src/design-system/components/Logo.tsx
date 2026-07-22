"use client";

import { motion } from "framer-motion";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const dotSize = size === "lg" ? 10 : size === "sm" ? 5 : 7;

  return (
    <div className="flex items-center gap-2">
      <span className={`${textSize} font-display text-ink tracking-[2px]`}>VELTRA</span>
      <motion.span
        style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2 }}
        className="bg-progress inline-block"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
