"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Status } from "@/lib/validation";
import type { DailyTaskEntity } from "@/lib/queries/types";
import { TaskCard } from "./TaskCard";

const STATUS_LABEL: Record<Status, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

/** The droppable id used for a column, so `onDragEnd` can tell a column from a card. */
export const columnDroppableId = (status: Status) => `column:${status}`;

interface KanbanColumnProps {
  status: Status;
  tasks: DailyTaskEntity[];
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });

  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-zinc-200 bg-zinc-100/70">
      <header className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold text-zinc-800">
          {STATUS_LABEL[status]}
        </h2>
        <span className="rounded-full bg-zinc-200 px-2 text-xs font-medium tabular-nums text-zinc-600">
          {tasks.length}
        </span>
      </header>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          data-testid={`column-${status}`}
          className={`flex min-h-[6rem] flex-1 flex-col gap-2 rounded-b-lg p-2 transition-colors ${
            isOver ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300" : ""
          }`}
        >
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">
              여기로 카드를 끌어다 놓으세요
            </p>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </SortableContext>
    </section>
  );
}
