import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { monthlyGoalService } from "@/lib/services";
import { createMonthlyGoal, monthlyGoalQuery } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = monthlyGoalQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json(await monthlyGoalService.list(query));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const input = createMonthlyGoal.parse(await req.json());
  const created = await monthlyGoalService.create(input);
  return NextResponse.json(created, { status: 201 });
});
