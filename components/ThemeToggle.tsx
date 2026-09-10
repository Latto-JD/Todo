"use client";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { IconMoon, IconSun } from "./icons";

/**
 * Light/dark switch.
 *
 * Deliberately stateless: the current theme lives in the `.dark` class on
 * <html>, which the pre-paint script in the root layout has already set by the
 * time React hydrates. Reading it into React state instead would make the
 * server render (which cannot know the stored preference) disagree with the
 * client and trigger a hydration mismatch — so which glyph shows is decided by
 * CSS (`dark:`) rather than by a render, and the button renders identically on
 * both sides.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled: the toggle still works for this page.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="라이트/다크 테마 전환"
      title="라이트/다크 테마 전환"
      data-testid="theme-toggle"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <IconMoon className="size-4 dark:hidden" />
      <IconSun className="hidden size-4 dark:block" />
    </button>
  );
}
