"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { EntityForm } from "@/components/EntityForm";
import {
  IconAlert,
  IconClock,
  IconGrip,
  STATUS_ICON,
  STATUS_TONE,
} from "@/components/icons";
import { useDeleteEntity } from "@/lib/queries";
import type { DailyTaskEntity } from "@/lib/queries/types";

interface TaskCardProps {
  task: DailyTaskEntity;
}

/**
 * Is this card's deadline already behind us? A finished task is never overdue,
 * however late it was — the badge is a call to act, and there is nothing left
 * to do on a done card.
 */
function isOverdue(task: DailyTaskEntity): boolean {
  if (!task.due_date || task.status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.due_date) < today;
}

/** Draggable kanban card. Drag is initiated from the handle only. */
export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteEntity("daily-tasks");

  const StatusIcon = STATUS_ICON[task.status];
  const overdue = isOverdue(task);
  const DueIcon = overdue ? IconAlert : IconClock;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`task-${task.id}`}
      className={`flex items-start gap-1.5 rounded-md border bg-white p-2 text-sm dark:bg-zinc-800 ${
        isDragging
          ? "border-emerald-400 shadow-lg dark:border-emerald-500"
          : "border-zinc-200 shadow-sm dark:border-zinc-700"
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${task.title} 카드 이동`}
        data-testid={`drag-${task.id}`}
        className="mt-0.5 cursor-grab touch-none rounded px-0.5 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-400"
      >
        <IconGrip className="size-4" />
      </button>

      <StatusIcon
        className={`mt-0.5 size-4 shrink-0 ${STATUS_TONE[task.status]}`}
      />

      <div className="min-w-0 flex-1">
        <p
          className={`break-words font-medium ${
            task.status === "done"
              ? "text-zinc-400 line-through dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {task.title}
        </p>
        {task.due_date && (
          <p
            className={`mt-0.5 flex items-center gap-1 text-xs ${
              overdue
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <DueIcon className="size-3.5 shrink-0" />
            마감 {task.due_date.slice(0, 10)}
            {overdue && <span className="sr-only">(기한 지남)</span>}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid={`edit-${task.id}`}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          data-testid={`delete-${task.id}`}
          className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          삭제
        </button>
      </div>

      {editing && (
        <EntityForm
          entityType="daily-tasks"
          mode="edit"
          initial={task}
          onDone={() => setEditing(false)}
        />
      )}

      <ConfirmDeleteModal
        open={confirming}
        itemName={task.title}
        busy={del.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          del.mutate(task.id, {
            onSuccess: () => setConfirming(false),
            onError: () => setConfirming(false),
          })
        }
      />
    </div>
  );
}
