import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { weeklyPlanService } from "@/lib/services";
import { createWeeklyPlan, weeklyPlanQuery } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = weeklyPlanQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json(await weeklyPlanService.list(query));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const input = createWeeklyPlan.parse(await req.json());
  const created = await weeklyPlanService.create(input);
  return NextResponse.json(created, { status: 201 });
});
