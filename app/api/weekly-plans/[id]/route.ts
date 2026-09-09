import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { weeklyPlanService } from "@/lib/services";
import { updateWeeklyPlan } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await weeklyPlanService.get(id));
});

export const PATCH = handleRoute<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params;
  const patch = updateWeeklyPlan.parse(await req.json());
  return NextResponse.json(await weeklyPlanService.update(id, patch));
});

export const DELETE = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  await weeklyPlanService.remove(id);
  return new NextResponse(null, { status: 204 });
});
