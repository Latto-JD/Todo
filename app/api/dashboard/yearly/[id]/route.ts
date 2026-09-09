import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { MonthlyGoal, YearlyGoal } from "@/lib/models";
import { childProgressList, loadOr404 } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only dashboard aggregation for one YearlyGoal (US-007 / docs/PLAN.md §2.4).
 * Returns the goal with its denormalised `progress` plus each child MonthlyGoal's
 * `{ id, title, progress }`. Progress is read, never recomputed.
 */
export const GET = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const yearlyDoc = await loadOr404(YearlyGoal, id);
  const monthlies = await childProgressList(MonthlyGoal, id);

  return NextResponse.json({ yearly: yearlyDoc.toJSON(), monthlies });
});
