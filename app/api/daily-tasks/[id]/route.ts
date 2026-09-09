import { NextResponse, type NextRequest } from "next/server";
import { handleRoute } from "@/lib/api-error";
import { dailyTaskService } from "@/lib/services";
import { updateDailyTask } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await dailyTaskService.get(id));
});

export const PATCH = handleRoute<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params;
  const patch = updateDailyTask.parse(await req.json());
  return NextResponse.json(await dailyTaskService.update(id, patch));
});

export const DELETE = handleRoute<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  await dailyTaskService.remove(id);
  return new NextResponse(null, { status: 204 });
});
