import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { dailyTaskService } from "@/lib/services";
import { createDailyTask, dailyTaskQuery } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = dailyTaskQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json(await dailyTaskService.list(query));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const input = createDailyTask.parse(await req.json());
  const created = await dailyTaskService.create(input);
  return NextResponse.json(created, { status: 201 });
});
