"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { EntityForm } from "@/components/EntityForm";
import { useDeleteEntity } from "@/lib/queries";
import type { DailyTaskEntity } from "@/lib/queries/types";

interface TaskCardProps {
  task: DailyTaskEntity;
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
      className={`flex items-start gap-2 rounded-md border bg-white p-2 text-sm ${
        isDragging
          ? "border-emerald-400 shadow-lg"
          : "border-zinc-200 shadow-sm"
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${task.title} 카드 이동`}
        data-testid={`drag-${task.id}`}
        className="mt-0.5 cursor-grab touch-none rounded px-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium text-zinc-900">{task.title}</p>
        {task.due_date && (
          <p className="mt-0.5 text-xs text-zinc-500">
            마감 {task.due_date.slice(0, 10)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid={`edit-${task.id}`}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          data-testid={`delete-${task.id}`}
          className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
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
