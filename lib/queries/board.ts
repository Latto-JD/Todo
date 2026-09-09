"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api-client";
import { toast } from "@/components/Toast";
import type { Status } from "@/lib/validation";
import { keys } from "./keys";
import { toErrorMessage } from "./entities";
import type { DailyTaskEntity, EntityType } from "./types";

/** Grouped read model returned by `GET /api/board`. */
export interface Board {
  todo: DailyTaskEntity[];
  doing: DailyTaskEntity[];
  done: DailyTaskEntity[];
}

export const boardKey = (weeklyPlanId: string) => ["board", weeklyPlanId] as const;

/** Plan levels whose `progress` a board mutation can shift. */
const PLAN_TYPES: readonly EntityType[] = [
  "weekly-plans",
  "monthly-goals",
  "yearly-goals",
];

export function useBoard(
  weeklyPlanId: string | null | undefined,
): UseQueryResult<Board> {
  return useQuery({
    queryKey: boardKey(weeklyPlanId ?? ""),
    queryFn: () =>
      apiGet<Board>(`/api/board?parent_id=${encodeURIComponent(weeklyPlanId ?? "")}`),
    enabled: weeklyPlanId != null && weeklyPlanId !== "",
  });
}

/** One card's new position on the board. */
export interface OrderUpdate {
  id: string;
  order: number;
}

interface MoveVars {
  taskId: string;
  status: Status;
  order: number;
  /** Other cards in the destination column whose `order` also shifts. */
  siblingUpdates?: OrderUpdate[];
  /** Full next board for the optimistic cache write. */
  optimistic: Board;
}

interface ReorderVars {
  updates: OrderUpdate[];
  optimistic: Board;
}

interface BoardContext {
  previous: Board | undefined;
}

function useBoardInvalidation(weeklyPlanId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: boardKey(weeklyPlanId) });
    // A card status/order change can move `progress` up the whole parent chain.
    for (const type of PLAN_TYPES) {
      void qc.invalidateQueries({ queryKey: keys.all(type) });
    }
  };
}

function useOptimisticBoard(weeklyPlanId: string) {
  const qc = useQueryClient();
  return {
    async snapshot(next: Board): Promise<BoardContext> {
      await qc.cancelQueries({ queryKey: boardKey(weeklyPlanId) });
      const previous = qc.getQueryData<Board>(boardKey(weeklyPlanId));
      qc.setQueryData(boardKey(weeklyPlanId), next);
      return { previous };
    },
    rollback(ctx: BoardContext | undefined) {
      if (ctx?.previous) {
        qc.setQueryData(boardKey(weeklyPlanId), ctx.previous);
      }
    },
  };
}

/**
 * Cross-column drop: `PATCH /api/daily-tasks/{id}/move` sets `status` + `order`
 * atomically and cascades progress; any displaced siblings in the target column
 * get a plain `order` PATCH afterward. Optimistic board write with snapshot
 * rollback on failure.
 */
export function useMoveTask(weeklyPlanId: string) {
  const optimistic = useOptimisticBoard(weeklyPlanId);
  const invalidate = useBoardInvalidation(weeklyPlanId);

  return useMutation<void, unknown, MoveVars, BoardContext>({
    mutationFn: async ({ taskId, status, order, siblingUpdates }) => {
      await apiPatch(`/api/daily-tasks/${taskId}/move`, { status, order });
      if (siblingUpdates && siblingUpdates.length > 0) {
        await Promise.all(
          siblingUpdates.map((u) =>
            apiPatch(`/api/daily-tasks/${u.id}`, { order: u.order }),
          ),
        );
      }
    },
    onMutate: (vars) => optimistic.snapshot(vars.optimistic),
    onError: (err, _vars, ctx) => {
      optimistic.rollback(ctx);
      toast.error(toErrorMessage(err));
    },
    onSettled: () => invalidate(),
  });
}

/**
 * Same-column reorder: batch `order` PATCH for every card in the column.
 * Optimistic board write with snapshot rollback on failure.
 */
export function useReorderColumn(weeklyPlanId: string) {
  const optimistic = useOptimisticBoard(weeklyPlanId);
  const invalidate = useBoardInvalidation(weeklyPlanId);

  return useMutation<void, unknown, ReorderVars, BoardContext>({
    mutationFn: async ({ updates }) => {
      await Promise.all(
        updates.map((u) => apiPatch(`/api/daily-tasks/${u.id}`, { order: u.order })),
      );
    },
    onMutate: (vars) => optimistic.snapshot(vars.optimistic),
    onError: (err, _vars, ctx) => {
      optimistic.rollback(ctx);
      toast.error(toErrorMessage(err));
    },
    onSettled: () => invalidate(),
  });
}
