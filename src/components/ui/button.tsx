"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "olive" | "wrong";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[0_3px_0_var(--accent-press)] active:shadow-[0_0_0_var(--accent-press)] active:translate-y-[3px]",
  olive:
    "bg-olive text-card shadow-[0_3px_0_color-mix(in_oklab,var(--olive),black_25%)] active:shadow-none active:translate-y-[3px]",
  wrong:
    "bg-wrong text-card shadow-[0_3px_0_color-mix(in_oklab,var(--wrong),black_25%)] active:shadow-none active:translate-y-[3px]",
  secondary:
    "bg-card text-ink border border-line shadow-[0_3px_0_var(--line)] active:shadow-none active:translate-y-[3px]",
  ghost: "text-ink-2 hover:text-ink hover:bg-paper-2",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[15px] rounded-xl",
  lg: "h-14 px-6 text-[17px] rounded-2xl",
};

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, className = "", type = "button", ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: variant === "ghost" ? 0 : -1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`relative inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color,color,opacity] duration-100 disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
});
