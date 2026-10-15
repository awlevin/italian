import type { ClerkProvider } from "@clerk/nextjs";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof ClerkProvider>;

/**
 * Clerk's prebuilt UI dressed in Ponte's design system.
 * Clerk styles live in the "clerk" CSS layer (declared in globals.css),
 * so the Tailwind classes below win without !important. Inside Clerk
 * elements `--accent` is Clerk's own variable, so use `--ponte-accent`
 * (defined in app/clerk.css) for the accent color.
 */
export const clerkAppearance: Props["appearance"] = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--ponte-accent)",
    colorPrimaryForeground: "var(--accent-ink)",
    colorBackground: "var(--card)",
    colorForeground: "var(--ink)",
    colorMuted: "var(--paper-2)",
    colorMutedForeground: "var(--ink-2)",
    colorInput: "var(--paper)",
    colorInputForeground: "var(--ink)",
    colorBorder: "var(--line)",
    colorNeutral: "var(--ink)",
    colorDanger: "var(--wrong)",
    colorSuccess: "var(--olive)",
    colorWarning: "var(--lemon)",
    colorShadow: "rgb(var(--shadow))",
    colorRing: "var(--sea)",
    colorModalBackdrop: "rgb(var(--shadow) / 0.45)",
    fontFamily: "var(--font-body)",
    fontFamilyButtons: "var(--font-body)",
    fontFamilyMono: "var(--font-mono)",
    fontSize: "0.9375rem",
    borderRadius: "0.85rem",
  },
  options: {
    socialButtonsVariant: "blockButton",
    // A personal app on a dev instance: the banner is noise for its one user.
    unsafe_disableDevelopmentModeWarnings: true,
  },
  elements: {
    modalBackdrop: "backdrop-blur-[3px] items-end sm:items-center",
    modalContent: "my-0 sm:my-16",
    cardBox: "rounded-[26px] shadow-lift border border-line max-sm:rounded-b-none max-sm:border-b-0",
    card: "bg-card px-6 pt-8 pb-7 gap-7",
    headerTitle: "font-display text-[28px] font-normal leading-tight tracking-[-0.02em] text-ink",
    headerSubtitle: "text-[15px] text-ink-2",
    socialButtonsBlockButton:
      "h-12 rounded-xl border border-line bg-paper shadow-[0_3px_0_var(--line)] transition-[translate,box-shadow] active:translate-y-[3px] active:shadow-none hover:bg-paper-2",
    socialButtonsBlockButtonText: "text-[15px] font-semibold text-ink",
    dividerLine: "bg-line",
    dividerText: "text-ink-3 text-[13px]",
    formFieldLabel: "text-[14px] font-semibold text-ink",
    // 16px keeps iOS from zooming the page when the field is focused.
    // Focus uses the app-wide :focus-visible ring from globals.css.
    formFieldInput:
      "h-12 rounded-xl border border-line bg-paper text-[16px] text-ink shadow-none placeholder:text-ink-3 focus:shadow-none",
    otpCodeFieldInput: "text-[20px] font-mono border-line bg-paper text-ink",
    formButtonPrimary:
      "h-12 rounded-xl bg-(--ponte-accent) bg-none text-[16px] font-semibold text-accent-ink normal-case shadow-[0_3px_0_var(--accent-press)] transition-[translate,box-shadow] hover:bg-(--ponte-accent) active:translate-y-[3px] active:shadow-none after:hidden",
    buttonArrowIcon: "hidden",
    footer: "bg-paper-2 bg-none",
    footerActionText: "text-[14px] text-ink-2",
    footerActionLink: "text-[14px] font-semibold text-(--ponte-accent) hover:text-accent-press",
    identityPreview: "rounded-xl border border-line bg-paper",
    formResendCodeLink: "text-(--ponte-accent) font-semibold",
    userButtonPopoverCard: "rounded-2xl border border-line shadow-lift",
    userButtonPopoverMain: "bg-card",
    userButtonPopoverFooter: "bg-paper-2 bg-none",
    userButtonPopoverActionButton: "text-ink-2 hover:bg-paper-2 hover:text-ink",
  },
};

/** Clerk shows the dev instance's slug as the app name; Ponte says its own name. */
const app = "Ponte";

export const clerkLocalization: Props["localization"] = {
  signIn: {
    start: {
      title: "Bentornato",
      titleCombined: "Bentornato",
      subtitle: `Sign in to ${app} and pick up where you left off.`,
      subtitleCombined: `Sign in to ${app} and pick up where you left off.`,
    },
    emailCode: { subtitle: `to continue to ${app}` },
    emailCodeMfa: { subtitle: `to continue to ${app}` },
    emailLink: { subtitle: `to continue to ${app}` },
    emailLinkMfa: { subtitle: `to continue to ${app}` },
    phoneCode: { subtitle: `to continue to ${app}` },
  },
  signUp: {
    start: {
      title: "Il tuo biglietto",
      titleCombined: "Il tuo biglietto",
      subtitle: "Make an account so your progress rides along on every device.",
      subtitleCombined: "Make an account so your progress rides along on every device.",
    },
    emailLink: { subtitle: `to continue to ${app}` },
  },
};
