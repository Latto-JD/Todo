import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { notFound } from "@/lib/api-error";
import { DailyTask } from "@/lib/models";
import { statusEnum } from "@/lib/validation";
import { onEntityMutated } from "./progressHook";
import { assertValidId, type EntityJSON } from "./shared";

/** Body of `PATCH /api/daily-tasks/[id]/move` — the kanban drop payload. */
export const moveDailyTaskBody = z.object({
  status: statusEnum,
  order: z.number().int(),
});

export type MoveDailyTaskInput = z.infer<typeof moveDailyTaskBody>;

/**
 * Kanban move: set `status` + `order` in one atomic document update, reconcile
 * `completed_at` against the *previous* status, then run the progress cascade.
 *
 * `completed_at` is derived inside the update pipeline so no read-modify-write
 * window exists: within a single `$set` stage every `$field` reference resolves
 * against the pre-update document, so `$status` is the old status.
 *
 * Lives outside `dailyTaskService` because M3 and M4 own separate files; the
 * cascade trigger is the same {@link onEntityMutated} seam every other mutation
 * uses.
 */
export async function moveDailyTask(
  id: string,
  input: MoveDailyTaskInput,
): Promise<EntityJSON> {
  await connectToDatabase();
  assertValidId(id);

  const { status, order } = input;
  const now = new Date();

  const doc = await DailyTask.findOneAndUpdate(
    { _id: id },
    [
      {
        $set: {
          completed_at:
            status === "done"
              ? { $cond: [{ $eq: ["$status", "done"] }, "$completed_at", now] }
              : null,
        },
      },
      { $set: { status, order } },
    ],
    // Mongoose 9 requires opting in explicitly before it forwards an
    // aggregation pipeline as the update document.
    { returnDocument: "after", updatePipeline: true },
  );

  if (!doc) throw notFound();

  await onEntityMutated("DailyTask", id);
  return (doc as { toJSON: () => unknown }).toJSON() as EntityJSON;
}
