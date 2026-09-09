import mongoose, { type ClientSession, type Model, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { DailyTask, WeeklyPlan, MonthlyGoal, YearlyGoal } from "@/lib/models";
import type { EntityType } from "./progressHook";

/**
 * Synchronous progress cascade (US-004 / docs/PLAN.md §2.3).
 *
 * `progress` is denormalised on WeeklyPlan / MonthlyGoal / YearlyGoal. Every
 * recompute **re-queries current DB state** (counts and averages) rather than
 * applying a delta — that re-query is the race-safety guarantee: two concurrent
 * mutations can only ever converge on the value the collection actually holds.
 *
 * Formulas (all `Math.round`, 0 children → 0):
 *   WeeklyPlan.progress  = done DailyTasks with this parent / all DailyTasks with this parent × 100
 *   MonthlyGoal.progress = mean of child WeeklyPlan.progress
 *   YearlyGoal.progress  = mean of child MonthlyGoal.progress
 *
 * Children with `parent_id: null` are never matched by `{ parent_id: <id> }`,
 * so unassigned items are excluded from every parent's progress (criterion 19).
 */

/** An id as it arrives from a route/service (string) or from a loaded doc. */
type IdLike = string | Types.ObjectId;

/**
 * The parent-chain topology, in one place.
 *
 * Every caller that needs "what does a `prevParentId` of this entity refer to"
 * imports this rather than restating the chain — the cascade's correctness
 * depends on all of them agreeing.
 */
export const PARENT_TYPE: Record<EntityType, EntityType | null> = {
  DailyTask: "WeeklyPlan",
  WeeklyPlan: "MonthlyGoal",
  MonthlyGoal: "YearlyGoal",
  YearlyGoal: null,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyModel = Model<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Shape of the lean projections this module reads. */
interface ProgressLean {
  _id: Types.ObjectId;
  parent_id?: Types.ObjectId | null;
  progress?: number;
}

const queryOptions = (session?: ClientSession) => (session ? { session } : {});

/* ------------------------------------------------------------------ *
 * Transaction support
 * ------------------------------------------------------------------ */

/**
 * Per-connection memo of "does this deployment support multi-document
 * transactions". Keyed on the live connection object so a reconnect (tests
 * swapping in an in-memory server) re-probes instead of reusing a stale answer.
 */
const txnSupportByConnection = new WeakMap<object, boolean>();

async function supportsTransactions(m: typeof mongoose): Promise<boolean> {
  const conn = m.connection;
  const cached = txnSupportByConnection.get(conn);
  if (cached !== undefined) return cached;

  let supported = false;
  try {
    const db = conn.db;
    if (db) {
      // Replica set members report `setName`; a mongos reports `msg: 'isdbgrid'`.
      // A standalone mongod reports neither and cannot start a transaction.
      const info = (await db.admin().command({ hello: 1 })) as {
        setName?: string;
        msg?: string;
      };
      supported = Boolean(info.setName) || info.msg === "isdbgrid";
    }
  } catch {
    supported = false;
  }

  txnSupportByConnection.set(conn, supported);
  return supported;
}

/**
 * Run `fn` inside a MongoDB transaction when the deployment supports one
 * (Atlas M0 and any replica set do), otherwise run it with sequential
 * unsessioned writes.
 *
 * The fallback is safe-but-weaker: each individual write still recomputes from
 * current DB state, so the cascade stays correct for sequential callers; only
 * the "two concurrent mutations of the same parent" case (§6 P9) loses its
 * write-conflict retry.
 */
export async function withOptionalTransaction<T>(
  fn: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  const m = await connectToDatabase();

  if (!(await supportsTransactions(m))) {
    return fn();
  }

  const session = await m.startSession();
  try {
    let result!: T;
    // withTransaction retries the callback on transient errors (WriteConflict),
    // which is what makes concurrent recalculations converge.
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/* ------------------------------------------------------------------ *
 * Recomputation
 * ------------------------------------------------------------------ */

async function computeWeeklyProgress(
  weeklyId: IdLike,
  session?: ClientSession,
): Promise<number> {
  const opts = queryOptions(session);
  const total = await DailyTask.countDocuments({ parent_id: weeklyId }, opts);
  if (total === 0) return 0;
  const done = await DailyTask.countDocuments(
    { parent_id: weeklyId, status: "done" },
    opts,
  );
  return Math.round((done / total) * 100);
}

async function computeAverageChildProgress(
  childModel: AnyModel,
  parentId: IdLike,
  session?: ClientSession,
): Promise<number> {
  const children = (await childModel
    .find({ parent_id: parentId }, { progress: 1 }, queryOptions(session))
    .lean()) as ProgressLean[];

  if (children.length === 0) return 0;
  const sum = children.reduce((acc, child) => acc + (child.progress ?? 0), 0);
  return Math.round(sum / children.length);
}

async function persistProgress(
  model: AnyModel,
  id: IdLike,
  progress: number,
  session?: ClientSession,
): Promise<void> {
  await model.updateOne({ _id: id }, { $set: { progress } }, queryOptions(session));
}

/* ------------------------------------------------------------------ *
 * Cascade
 * ------------------------------------------------------------------ */

async function cascadeFromYearly(yearlyId: IdLike, session?: ClientSession): Promise<void> {
  const yearly = (await YearlyGoal.findById(
    yearlyId,
    { _id: 1 },
    queryOptions(session),
  ).lean()) as ProgressLean | null;
  if (!yearly) return;

  const progress = await computeAverageChildProgress(MonthlyGoal, yearlyId, session);
  await persistProgress(YearlyGoal, yearlyId, progress, session);
}

async function cascadeFromMonthly(monthlyId: IdLike, session?: ClientSession): Promise<void> {
  const monthly = (await MonthlyGoal.findById(
    monthlyId,
    { parent_id: 1 },
    queryOptions(session),
  ).lean()) as ProgressLean | null;
  if (!monthly) return;

  const progress = await computeAverageChildProgress(WeeklyPlan, monthlyId, session);
  await persistProgress(MonthlyGoal, monthlyId, progress, session);

  if (monthly.parent_id) await cascadeFromYearly(monthly.parent_id, session);
}

async function cascadeFromWeekly(weeklyId: IdLike, session?: ClientSession): Promise<void> {
  const weekly = (await WeeklyPlan.findById(
    weeklyId,
    { parent_id: 1 },
    queryOptions(session),
  ).lean()) as ProgressLean | null;
  if (!weekly) return;

  const progress = await computeWeeklyProgress(weeklyId, session);
  await persistProgress(WeeklyPlan, weeklyId, progress, session);

  if (weekly.parent_id) await cascadeFromMonthly(weekly.parent_id, session);
}

/**
 * One cascade, on an existing session (or none). Exported for
 * {@link ./progressHook} so an old-parent chain and a new-parent chain can share
 * a single transaction.
 *
 * A missing target is a silent no-op: after a delete the id no longer resolves,
 * and the caller recalculates the ex-parent via `prevParentId` instead.
 */
export async function cascadeWithin(
  entityType: EntityType,
  entityId: IdLike,
  session?: ClientSession,
): Promise<void> {
  if (!mongoose.isValidObjectId(entityId)) return;

  switch (entityType) {
    case "DailyTask": {
      // A DailyTask has no progress of its own; the cascade starts at its
      // current WeeklyPlan parent. Unparented tasks affect nothing.
      const task = (await DailyTask.findById(
        entityId,
        { parent_id: 1 },
        queryOptions(session),
      ).lean()) as ProgressLean | null;
      if (task?.parent_id) await cascadeFromWeekly(task.parent_id, session);
      return;
    }
    case "WeeklyPlan":
      return cascadeFromWeekly(entityId, session);
    case "MonthlyGoal":
      return cascadeFromMonthly(entityId, session);
    case "YearlyGoal":
      return cascadeFromYearly(entityId, session);
  }
}

/**
 * Recompute `entityId`'s progress and every ancestor's, up to three hops
 * (Weekly → Monthly → Yearly), in one transaction where available.
 *
 * `recalculate('DailyTask', id)` resolves the task's **current** `parent_id` and
 * cascades from that WeeklyPlan; a task with no parent is a no-op. Callers pass
 * the id of the entity they mutated — never a pre-resolved parent id — and the
 * old-parent chain is handled by `onEntityMutated`'s `prevParentId`.
 */
export async function recalculate(entityType: EntityType, entityId: string): Promise<void> {
  await withOptionalTransaction((session) => cascadeWithin(entityType, entityId, session));
}
