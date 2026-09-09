import { cascadeWithin, withOptionalTransaction, PARENT_TYPE } from "./progressService";

/**
 * Progress-recalculation seam (US-003 → US-004).
 *
 * Every mutating service operation (create / update / remove) calls
 * `onEntityMutated` after its write commits. M4 (US-004) implements the body:
 * it drives the synchronous cascade that recomputes `progress` up the
 * `parent_id` chain (Weekly → Monthly → Yearly), re-querying current DB state
 * at every hop.
 *
 * Contract — do NOT change the signature without updating every caller:
 *
 *   entityType  which collection the mutated document belongs to
 *   id          the mutated document's id (string). For `remove` this id no
 *               longer exists; the cascade from it is a no-op and the ex-parent
 *               is recalculated from `opts.prevParentId`.
 *   opts.prevParentId
 *               - update: the previous `parent_id` (string) ONLY when it changed
 *                 in this operation; `undefined`/omitted when the parent is
 *                 unchanged; `null` when it was previously unassigned.
 *               - remove: the removed document's `parent_id` at deletion time
 *                 (string, or `null` when it was unassigned).
 *               - create: omitted.
 *
 * When a parent reassignment happens, BOTH the old parent (via `prevParentId`)
 * and the new parent (reachable from `id`) are recalculated — and both chains
 * share one transaction so a reparent is never observed half-applied.
 */
export type EntityType = "DailyTask" | "WeeklyPlan" | "MonthlyGoal" | "YearlyGoal";

export interface EntityMutationOpts {
  prevParentId?: string | null;
}

export async function onEntityMutated(
  entityType: EntityType,
  id: string,
  opts?: EntityMutationOpts,
): Promise<void> {
  const prevParentId = opts?.prevParentId;
  const parentType = PARENT_TYPE[entityType];

  await withOptionalTransaction(async (session) => {
    // New/current chain. For a removed document this resolves to nothing.
    await cascadeWithin(entityType, id, session);

    // Old chain, on reparent or removal. `null` means it was unassigned, so
    // there is no old parent to fix up.
    if (prevParentId != null && parentType) {
      await cascadeWithin(parentType, prevParentId, session);
    }
  });
}
