import { connectToDatabase } from "@/lib/db";
import { notFound } from "@/lib/api-error";
import { DailyTask } from "@/lib/models";
import { onEntityMutated } from "./progressHook";
import { assertValidId, makeService, type EntityJSON } from "./shared";

const asJSON = (doc: { toJSON: () => unknown }): EntityJSON => doc.toJSON() as EntityJSON;

const base = makeService(DailyTask, "DailyTask", { sort: { order: 1, createdAt: 1 } });

/**
 * Reconcile `completed_at` with a status change (free transitions, no state machine):
 * entering `done` stamps it, leaving `done` clears it.
 */
function reconcileCompletedAt(wasDone: boolean, nextStatus: string | undefined): Date | null | undefined {
  if (nextStatus === undefined) return undefined;
  const isDone = nextStatus === "done";
  if (isDone && !wasDone) return new Date();
  if (!isDone && wasDone) return null;
  return undefined;
}

export const dailyTaskService = {
  ...base,

  async create(input: Record<string, unknown>): Promise<EntityJSON> {
    await connectToDatabase();
    const data = { ...input };
    if (data.status === "done" && data.completed_at == null) {
      data.completed_at = new Date();
    }
    // PLAN §2.2: `order` defaults to max+1 within the same column (same
    // parent_id + status), so a new task lands at the bottom rather than
    // colliding with an existing card at 0. An explicit `order` wins.
    if (data.order == null) {
      const parent_id = (data.parent_id ?? null) as string | null;
      const status = (data.status as "todo" | "doing" | "done" | undefined) ?? "todo";
      const last = await DailyTask.findOne({ parent_id, status })
        .sort({ order: -1 })
        .select("order")
        .lean<{ order?: number } | null>();
      data.order = last?.order != null ? last.order + 1 : 0;
    }
    const doc = await DailyTask.create(data);
    await onEntityMutated("DailyTask", String(doc._id));
    return asJSON(doc);
  },

  async update(id: string, patch: Record<string, unknown>): Promise<EntityJSON> {
    await connectToDatabase();
    assertValidId(id);
    const doc = await DailyTask.findById(id);
    if (!doc) throw notFound();

    const prevParentId = doc.parent_id == null ? null : String(doc.parent_id);
    const completedAt = reconcileCompletedAt(doc.status === "done", patch.status as string | undefined);

    doc.set(patch);
    if (completedAt !== undefined) doc.completed_at = completedAt;
    await doc.save();

    const nextParentId = doc.parent_id == null ? null : String(doc.parent_id);
    await onEntityMutated("DailyTask", id, {
      prevParentId: prevParentId !== nextParentId ? prevParentId : undefined,
    });
    return asJSON(doc);
  },
};
