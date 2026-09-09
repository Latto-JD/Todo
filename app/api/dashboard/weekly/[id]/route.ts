import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { DailyTask, WeeklyPlan } from "@/lib/models";
import { loadOr404 } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

/**
 * Read-only dashboard aggregation for one WeeklyPlan (US-007 / docs/PLAN.md §2.4).
 * Returns the plan with its denormalised `progress` (kept current by the cascade
 * in lib/services/progressService.ts — never recomputed here) plus a status
 * summary of its child DailyTasks.
 */
export const GET = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const weeklyDoc = await loadOr404(WeeklyPlan, id);

  const taskDocs = await DailyTask.find({ parent_id: id }).sort({ status: 1, order: 1 });
  const tasks = taskDocs.map((doc) => doc.toJSON() as unknown as Json & { status: string });

  const taskSummary = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
    total: tasks.length,
  };

  return NextResponse.json({
    weekly: weeklyDoc.toJSON(),
    tasks,
    taskSummary,
  });
});
