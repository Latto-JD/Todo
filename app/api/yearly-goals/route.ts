import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { yearlyGoalService } from "@/lib/services";
import { createYearlyGoal, yearlyGoalQuery } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = yearlyGoalQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json(await yearlyGoalService.list(query));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const input = createYearlyGoal.parse(await req.json());
  const created = await yearlyGoalService.create(input);
  return NextResponse.json(created, { status: 201 });
});
