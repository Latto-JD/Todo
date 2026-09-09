import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { MonthlyGoal, WeeklyPlan } from "@/lib/models";
import { childProgressList, loadOr404 } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only dashboard aggregation for one MonthlyGoal (US-007 / docs/PLAN.md §2.4).
 * Returns the goal with its denormalised `progress` plus each child WeeklyPlan's
 * `{ id, title, progress }`. Progress is read, never recomputed.
 */
export const GET = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const monthlyDoc = await loadOr404(MonthlyGoal, id);
  const weeklies = await childProgressList(WeeklyPlan, id);

  return NextResponse.json({ monthly: monthlyDoc.toJSON(), weeklies });
});
