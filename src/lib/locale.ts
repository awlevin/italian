"use client";

import { useSyncExternalStore } from "react";

/**
 * The language of the app's own menus and buttons (not the lessons).
 * English by default, so beginners can find their way; Italian for immersion.
 */
export type UiLang = "en" | "it";

const KEY = "ciao:ui-lang";
const listeners = new Set<() => void>();

function read(): UiLang {
  try {
    return localStorage.getItem(KEY) === "it" ? "it" : "en";
  } catch {
    return "en";
  }
}

export function setUiLang(lang: UiLang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export function useUiLang(): UiLang {
  return useSyncExternalStore(subscribe, read, () => "en");
}

/** Picks the English or Italian copy for the current UI language: `t("Lessons", "Lezioni")`. */
export function useT() {
  const lang = useUiLang();
  return <T,>(en: T, it: T): T => (lang === "it" ? it : en);
}
