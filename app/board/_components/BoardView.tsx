"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/KanbanColumn";
import { ProgressBar } from "@/components/ProgressBar";
import {
  useBoard,
  useEntity,
  useEntityList,
  useMoveTask,
  useReorderColumn,
  type Board,
} from "@/lib/queries";
import { COLUMNS, computeDrag } from "./dnd";

const EMPTY_BOARD: Board = { todo: [], doing: [], done: [] };

export function BoardView() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string>(
    () => searchParams.get("parent_id") ?? "",
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const plansQuery = useEntityList("weekly-plans");
  const plans = plansQuery.data ?? [];

  const boardQuery = useBoard(selectedId || null);
  const planQuery = useEntity("weekly-plans", selectedId || null);
  const board = boardQuery.data ?? EMPTY_BOARD;

  const moveTask = useMoveTask(selectedId);
  const reorderColumn = useReorderColumn(selectedId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask =
    activeId != null
      ? [...board.todo, ...board.doing, ...board.done].find(
          (t) => t.id === activeId,
        ) ?? null
      : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !boardQuery.data) return;

    const outcome = computeDrag(
      boardQuery.data,
      String(active.id),
      String(over.id),
    );
    if (outcome.kind === "reorder") {
      reorderColumn.mutate({ updates: outcome.updates, optimistic: outcome.next });
    } else if (outcome.kind === "move") {
      moveTask.mutate({
        taskId: outcome.taskId,
        status: outcome.status,
        order: outcome.order,
        siblingUpdates: outcome.siblingUpdates,
        optimistic: outcome.next,
      });
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold">칸반 보드</h1>
            <p className="mt-1 text-sm text-zinc-600">
              카드를 드래그해 상태를 바꾸거나 같은 컬럼 안에서 순서를 바꾸세요.
            </p>
          </div>
          <Link href="/" className="text-sm text-emerald-600 hover:underline">
            홈
          </Link>
        </header>

        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            주간 계획
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full max-w-sm rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none"
              data-testid="weekly-plan-picker"
            >
              <option value="">주간 계획을 선택하세요</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          {selectedId && (
            <div data-testid="board-progress">
              <span className="mb-1 block text-xs font-medium text-zinc-600">
                주간 진행률
              </span>
              <ProgressBar
                value={planQuery.data?.progress ?? 0}
                label="주간 진행률"
              />
            </div>
          )}
        </div>

        {plansQuery.isLoading && (
          <p className="py-10 text-center text-sm text-zinc-400">
            주간 계획을 불러오는 중...
          </p>
        )}

        {!plansQuery.isLoading && plans.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-400">
            먼저{" "}
            <Link href="/hierarchy" className="text-emerald-600 hover:underline">
              목표 계층
            </Link>
            에서 주간 계획을 만드세요.
          </p>
        )}

        {!selectedId && plans.length > 0 && (
          <p className="py-10 text-center text-sm text-zinc-400">
            위에서 주간 계획을 선택하면 보드가 표시됩니다.
          </p>
        )}

        {selectedId && boardQuery.isLoading && (
          <p className="py-10 text-center text-sm text-zinc-400">
            보드를 불러오는 중...
          </p>
        )}

        {selectedId && boardQuery.isError && (
          <p className="py-10 text-center text-sm text-red-500">
            보드를 불러오지 못했습니다.
          </p>
        )}

        {selectedId && boardQuery.data && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {COLUMNS.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={board[status]}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="rounded-md border border-emerald-400 bg-white p-2 text-sm font-medium text-zinc-900 shadow-lg">
                  {activeTask.title}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
