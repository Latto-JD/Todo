/**
 * Where the chosen theme is remembered.
 *
 * Deliberately its own plain module rather than an export of the (client-only)
 * `ThemeToggle`: the root layout is a server component, and a value imported
 * from a `"use client"` module is a client reference there — reading it on the
 * server yields `undefined`, which silently produced a `getItem(undefined)` in
 * the pre-paint script. Both sides import it from here instead.
 */
export const THEME_STORAGE_KEY = "omc-todo-theme";

export type Theme = "light" | "dark";
