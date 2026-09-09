import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { moveDailyTask, moveDailyTaskBody } from "@/lib/services/dailyTaskMove";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kanban drop: atomically set `status` + `order`, then cascade progress upward. */
export const PATCH = handleRoute<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params;
  const body = moveDailyTaskBody.parse(await req.json());
  return NextResponse.json(await moveDailyTask(id, body));
});
