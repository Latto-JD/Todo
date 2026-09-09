import mongoose from "mongoose";
import { beforeAll } from "vitest";
import { connectToDatabase } from "@/lib/db";
import { DailyTask, WeeklyPlan, MonthlyGoal, YearlyGoal } from "@/lib/models";
import { setupTestDb as setupSharedTestDb } from "./mongo";

/**
 * Fixtures for the progress-cascade suite.
 *
 * The in-memory MongoDB **replica set** lifecycle is shared with the route
 * tests — see `setupTestDb()` in `./mongo`. A replica set (not a standalone
 * server) is required so `withOptionalTransaction` takes its transactional
 * path here rather than silently exercising only the fallback, and so the real
 * Atlas URI in `.env.local` is never reached from a test.
 */
export function setupTestDb(): void {
  setupSharedTestDb();
  // The route tests reach Mongo through services that call
  // `connectToDatabase()` themselves; these fixtures drive the models directly,
  // so the connection has to be opened explicitly or every model call buffers.
  beforeAll(async () => {
    await connectToDatabase();
  }, 60_000);
}

/** True when the live connection can start multi-document transactions. */
export async function connectionSupportsTransactions(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) return false;
  const info = (await db.admin().command({ hello: 1 })) as { setName?: string };
  return Boolean(info.setName);
}

const PERIOD = {
  period_start: new Date("2026-01-01T00:00:00.000Z"),
  period_end: new Date("2026-12-31T00:00:00.000Z"),
};

export async function makeYearly(title = "Yearly"): Promise<string> {
  const doc = await YearlyGoal.create({ title, ...PERIOD });
  return String(doc._id);
}

export async function makeMonthly(title = "Monthly", parentId?: string): Promise<string> {
  const doc = await MonthlyGoal.create({ title, ...PERIOD, parent_id: parentId ?? null });
  return String(doc._id);
}

export async function makeWeekly(title = "Weekly", parentId?: string): Promise<string> {
  const doc = await WeeklyPlan.create({ title, ...PERIOD, parent_id: parentId ?? null });
  return String(doc._id);
}

export async function makeTask(
  title = "Task",
  parentId?: string | null,
  status: "todo" | "doing" | "done" = "todo",
): Promise<string> {
  const doc = await DailyTask.create({
    title,
    ...PERIOD,
    status,
    completed_at: status === "done" ? new Date() : null,
    parent_id: parentId ?? null,
  });
  return String(doc._id);
}

/** Re-read persisted progress — these tests never trust an in-memory doc. */
export async function weeklyProgress(id: string): Promise<number> {
  const doc = await WeeklyPlan.findById(id).lean();
  return doc?.progress ?? -1;
}

export async function monthlyProgress(id: string): Promise<number> {
  const doc = await MonthlyGoal.findById(id).lean();
  return doc?.progress ?? -1;
}

export async function yearlyProgress(id: string): Promise<number> {
  const doc = await YearlyGoal.findById(id).lean();
  return doc?.progress ?? -1;
}
