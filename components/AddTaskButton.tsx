"use client";

import { useState } from "react";
import type { Status } from "@/lib/validation";
import { EntityForm } from "./EntityForm";
import { IconPlus } from "./icons";

interface AddTaskButtonProps {
  /**
   * WeeklyPlan to file the new task under. The board passes the plan currently
   * on screen so the card lands in the board you are looking at; elsewhere it is
   * omitted and the form's own "상위 주간 계획" select decides (defaulting to
   * 미분류).
   */
  parentId?: string | null;
  /** Column the task starts in. Omitted, the form defaults to `todo`. */
  status?: Status;
  /** `sm` for the board columns, `md` for a page header. */
  size?: "sm" | "md";
  /** Header buttons are solid; the per-column ones stay quiet until hovered. */
  variant?: "solid" | "ghost";
  label?: string;
  testId?: string;
}

const SIZE_CLASS = {
  sm: "gap-1 px-1.5 py-0.5 text-xs",
  md: "gap-1.5 px-2.5 py-1.5 text-sm",
} as const;

const VARIANT_CLASS = {
  solid:
    "bg-emerald-600 font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-500",
  ghost:
    "text-zinc-500 hover:bg-white hover:text-emerald-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-emerald-400",
} as const;

/**
 * "할 일 추가" — the entry point for creating a DailyTask.
 *
 * Reused in every page header and on each board column because a task is the
 * thing you add most often, while the hierarchy screen only creates the three
 * levels above it. `initial={{ status }}` is what lets a column's own button
 * drop the new card straight into that column.
 */
export function AddTaskButton({
  parentId,
  status,
  size = "md",
  variant = "solid",
  label = "할 일 추가",
  testId = "add-task",
}: AddTaskButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={testId}
        title={label}
        className={`inline-flex shrink-0 items-center rounded-md transition-colors ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]}`}
      >
        <IconPlus className={size === "md" ? "size-4" : "size-3.5"} />
        {label}
      </button>

      {open && (
        <EntityForm
          entityType="daily-tasks"
          mode="create"
          initial={status ? { status } : undefined}
          parentId={parentId ?? undefined}
          onDone={() => setOpen(false)}
        />
      )}
    </>
  );
}
