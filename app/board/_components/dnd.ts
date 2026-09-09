import { arrayMove } from "@dnd-kit/sortable";
import type { Status } from "@/lib/validation";
import type { Board, OrderUpdate } from "@/lib/queries";
import type { DailyTaskEntity } from "@/lib/queries/types";

export const COLUMNS: Status[] = ["todo", "doing", "done"];

const COLUMN_PREFIX = "column:";

/** Droppable id -> column status, or `null` when the id is a card id. */
export function parseColumnId(id: string): Status | null {
  if (!id.startsWith(COLUMN_PREFIX)) return null;
  const status = id.slice(COLUMN_PREFIX.length) as Status;
  return COLUMNS.includes(status) ? status : null;
}

/** Locate a card by id across all three columns. */
export function locate(
  board: Board,
  id: string,
): { col: Status; index: number } | null {
  for (const col of COLUMNS) {
    const index = board[col].findIndex((t) => t.id === id);
    if (index !== -1) return { col, index };
  }
  return null;
}

function cloneBoard(board: Board): Board {
  return {
    todo: [...board.todo],
    doing: [...board.doing],
    done: [...board.done],
  };
}

export type DragOutcome =
  | { kind: "noop" }
  | { kind: "reorder"; next: Board; updates: OrderUpdate[] }
  | {
      kind: "move";
      next: Board;
      taskId: string;
      status: Status;
      order: number;
      siblingUpdates: OrderUpdate[];
    };

/**
 * Resolve a drag end into the next board plus the minimal persistence payload.
 *
 * - same column  -> `reorder`: rewrite `order` for every card in that column
 * - other column -> `move`: `PATCH .../move` for the dragged card + `order`
 *   PATCH for the cards it displaces in the destination column
 */
export function computeDrag(
  board: Board,
  activeId: string,
  overId: string,
): DragOutcome {
  const from = locate(board, activeId);
  if (!from) return { kind: "noop" };

  const overColumn = parseColumnId(overId);
  let toCol: Status;
  let toIndex: number;

  if (overColumn) {
    toCol = overColumn;
    toIndex = board[toCol].length;
  } else {
    const over = locate(board, overId);
    if (!over) return { kind: "noop" };
    toCol = over.col;
    toIndex = over.index;
  }

  if (from.col === toCol) {
    if (overColumn) toIndex = board[toCol].length - 1;
    if (toIndex === from.index) return { kind: "noop" };

    const reordered = arrayMove(board[toCol], from.index, toIndex);
    const next = cloneBoard(board);
    next[toCol] = reordered;
    return {
      kind: "reorder",
      next,
      updates: reordered.map((t, i) => ({ id: t.id, order: i })),
    };
  }

  const moved: DailyTaskEntity = {
    ...board[from.col][from.index],
    status: toCol,
  };
  const next = cloneBoard(board);
  next[from.col] = board[from.col].filter((_, i) => i !== from.index);
  const target = [...board[toCol]];
  target.splice(Math.min(toIndex, target.length), 0, moved);
  next[toCol] = target;

  const finalIndex = target.findIndex((t) => t.id === activeId);
  const siblingUpdates = target
    .map((t, i) => ({ id: t.id, order: i }))
    .filter((u) => u.id !== activeId);

  return {
    kind: "move",
    next,
    taskId: activeId,
    status: toCol,
    order: finalIndex,
    siblingUpdates,
  };
}
