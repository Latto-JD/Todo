import { NextResponse, type NextRequest } from "next/server";
import { handleRoute, validationError } from "@/lib/api-error";
import { connectToDatabase } from "@/lib/db";
import { DailyTask } from "@/lib/models";
import { objectIdString, type Status } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BoardJSON = Record<string, unknown> & { id: string; status: Status };

/**
 * `GET /api/board?parent_id=<weeklyPlanId>` — the kanban read model.
 *
 * Returns every `DailyTask` under one `WeeklyPlan`, grouped by column and each
 * column sorted by `order` ascending (createdAt breaks ties). Thin: a single
 * indexed `find` on `{ parent_id, status, order }`, no service layer needed for a
 * pure grouped read.
 */
export const GET = handleRoute(async (req: NextRequest) => {
  const parsed = objectIdString.safeParse(req.nextUrl.searchParams.get("parent_id"));
  if (!parsed.success) {
    throw validationError("parent_id query parameter is required and must be a valid id");
  }

  await connectToDatabase();
  const docs = await DailyTask.find({ parent_id: parsed.data }).sort({ order: 1, createdAt: 1 });

  const board: Record<Status, BoardJSON[]> = { todo: [], doing: [], done: [] };
  for (const doc of docs) {
    const json = doc.toJSON() as unknown as BoardJSON;
    board[json.status].push(json);
  }

  return NextResponse.json(board);
});
