"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Status } from "@/lib/validation";
import type { DailyTaskEntity } from "@/lib/queries/types";
import { AddTaskButton } from "./AddTaskButton";
import { STATUS_ICON, STATUS_TONE } from "./icons";
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
  /** WeeklyPlan the column belongs to — the parent for cards added here. */
  weeklyId: string;
}

export function KanbanColumn({ status, tasks, weeklyId }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });
  const StatusIcon = STATUS_ICON[status];

  return (
    <section className="group/column flex min-w-0 flex-col rounded-lg border border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/70">
      <header className="flex items-center gap-2 px-3 py-2">
        <StatusIcon className={`size-4 shrink-0 ${STATUS_TONE[status]}`} />
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {STATUS_LABEL[status]}
        </h2>
        <span className="rounded-full bg-zinc-200 px-2 text-xs font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {tasks.length}
        </span>
        <span className="ml-auto">
          <AddTaskButton
            parentId={weeklyId}
            status={status}
            size="sm"
            variant="ghost"
            label="추가"
            testId={`add-task-${status}`}
          />
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
            isOver
              ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-700"
              : ""
          }`}
        >
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
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
