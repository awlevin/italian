"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "ok" | "wrong";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[0_3px_0_var(--accent-press)] active:shadow-[0_0_0_var(--accent-press)] active:translate-y-[3px]",
  ok:
    "bg-ok text-card shadow-[0_3px_0_color-mix(in_oklab,var(--ok),black_25%)] active:shadow-none active:translate-y-[3px]",
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

/** The tactile button look, for elements that are not a <Button> (e.g. links). */
export function buttonClass({ variant = "primary", size = "md", block }: { variant?: Variant; size?: Size; block?: boolean } = {}) {
  return `relative inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-[transform,translate,box-shadow,background-color,color,opacity] duration-100 disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""}`;
}

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Tapped and working (e.g. navigating): keeps the label, adds a spinner, ignores further taps. */
  pending?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, pending, className = "", type = "button", children, onClick, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: variant === "ghost" ? 0 : -1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`${buttonClass({ variant, size, block })} ${pending ? "cursor-progress" : ""} ${className}`}
      aria-busy={pending || undefined}
      onClick={pending ? undefined : onClick}
      {...rest}
    >
      {children}
      {pending && <Spinner />}
    </motion.button>
  );
});

/** A small ring that spins in the text colour, so it reads on every variant. */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
      style={{ width: size, height: size }}
    />
  );
}

/** A navigation link that looks and presses like a Button. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  block,
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; block?: boolean }) {
  return (
    <Link
      className={`${buttonClass({ variant, size, block })} ${variant === "ghost" ? "" : "hover:-translate-y-px"} ${className}`}
      {...rest}
    />
  );
}
