import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { monthlyGoalService } from "@/lib/services";
import { updateMonthlyGoal } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await monthlyGoalService.get(id));
});

export const PATCH = handleRoute<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params;
  const patch = updateMonthlyGoal.parse(await req.json());
  return NextResponse.json(await monthlyGoalService.update(id, patch));
});

export const DELETE = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  await monthlyGoalService.remove(id);
  return new NextResponse(null, { status: 204 });
});
