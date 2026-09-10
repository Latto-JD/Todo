"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function dismiss(id: number): void {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(kind: ToastKind, message: string): void {
  const id = nextId++;
  items = [...items, { id, kind, message }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), 4000);
  }
}

/** Module-level toast bus — call from anywhere, render with `<Toaster />`. */
export const toast = Object.assign((message: string) => push("info", message), {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
  dismiss,
});

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ToastItem[] {
  return items;
}

const EMPTY: ToastItem[] = [];

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY,
  );
}

const KIND_STYLES: Record<ToastKind, string> = {
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  info: "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
};

export function Toaster() {
  const toasts = useToasts();
  const onDismiss = useCallback((id: number) => dismiss(id), []);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label="알림"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={`rounded-md border px-3 py-2 text-left text-sm shadow-sm ${KIND_STYLES[t.kind]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
