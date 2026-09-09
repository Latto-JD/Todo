import mongoose, { type Model, type SortOrder } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { notFound } from "@/lib/api-error";
import { DailyTask, WeeklyPlan, MonthlyGoal } from "@/lib/models";
import { onEntityMutated, type EntityType } from "./progressHook";
import { PARENT_TYPE, cascadeWithin, withOptionalTransaction } from "./progressService";

/** Normalised list-query accepted by every entity service. */
export interface ListQuery {
  from?: Date;
  to?: Date;
  parent_id?: string;
  unassigned?: boolean;
  status?: string;
}

/** Plain JSON document (post-`toJSON`: `_id`→`id`, `__v` stripped). */
export type EntityJSON = Record<string, unknown> & { id: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyModel = Model<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

const toJSON = (doc: { toJSON: () => unknown }): EntityJSON => doc.toJSON() as EntityJSON;

/**
 * Direct-child model per entity, or `null` for the leaf (DailyTask).
 * Used by {@link makeService} `remove` to demote children to "unassigned"
 * (`parent_id: null`) before a hard delete, so a parent delete never orphans
 * its subtree (PLAN §2.4, acceptance criterion 20).
 */
const CHILD_MODEL: Record<EntityType, AnyModel | null> = {
  YearlyGoal: MonthlyGoal,
  MonthlyGoal: WeeklyPlan,
  WeeklyPlan: DailyTask,
  DailyTask: null,
};

/**
 * Build the Mongo filter for a list request.
 *
 * Period overlap: a doc `[period_start, period_end]` overlaps the requested
 * `[from, to]` window iff `period_start <= to AND period_end >= from`. Either
 * bound may be omitted.
 */
export function buildListFilter(query: ListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.to) filter.period_start = { $lte: query.to };
  if (query.from) filter.period_end = { $gte: query.from };

  if (query.unassigned) {
    filter.parent_id = null;
  } else if (query.parent_id) {
    filter.parent_id = query.parent_id;
  }

  if (query.status) filter.status = query.status;

  return filter;
}

export function assertValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw notFound();
}

function parentIdString(value: unknown): string | null {
  return value == null ? null : String(value);
}

export interface EntityService {
  list(query: ListQuery): Promise<EntityJSON[]>;
  get(id: string): Promise<EntityJSON>;
  create(input: Record<string, unknown>): Promise<EntityJSON>;
  update(id: string, patch: Record<string, unknown>): Promise<EntityJSON>;
  remove(id: string): Promise<void>;
}

interface ServiceOptions {
  sort?: Record<string, SortOrder>;
}

/**
 * Generic CRUD service. All methods `connectToDatabase()` first and route the
 * mutation through the {@link onEntityMutated} seam so US-004 can hook progress
 * recalculation in without rewriting any of this.
 */
export function makeService(
  model: AnyModel,
  entityType: EntityType,
  options: ServiceOptions = {},
): EntityService {
  const sort: Record<string, SortOrder> = options.sort ?? { period_start: 1, createdAt: 1 };

  async function loadOr404(id: string) {
    assertValidId(id);
    const doc = await model.findById(id);
    if (!doc) throw notFound();
    return doc;
  }

  return {
    async list(query) {
      await connectToDatabase();
      const docs = await model.find(buildListFilter(query)).sort(sort);
      return docs.map(toJSON);
    },

    async get(id) {
      await connectToDatabase();
      return toJSON(await loadOr404(id));
    },

    async create(input) {
      await connectToDatabase();
      const doc = await model.create(input);
      await onEntityMutated(entityType, String(doc._id));
      return toJSON(doc);
    },

    async update(id, patch) {
      await connectToDatabase();
      const doc = await loadOr404(id);
      const prevParentId = parentIdString(doc.get("parent_id"));

      doc.set(patch);
      await doc.save();

      const nextParentId = parentIdString(doc.get("parent_id"));
      await onEntityMutated(entityType, id, {
        prevParentId: prevParentId !== nextParentId ? prevParentId : undefined,
      });
      return toJSON(doc);
    },

    async remove(id) {
      await connectToDatabase();
      const doc = await loadOr404(id);
      const prevParentId = parentIdString(doc.get("parent_id"));
      const childModel = CHILD_MODEL[entityType];
      const parentType = PARENT_TYPE[entityType];

      // Child demotion + delete + ex-parent recalculation run in ONE transaction
      // (sequential fallback where the deployment has none) so a crash can never
      // leave children pointing at a deleted parent. Demoted children move to
      // `parent_id: null`, which drops them out of every parent's progress math,
      // so only the ex-parent chain needs recomputing — done here via
      // `cascadeWithin` on the shared session rather than the `onEntityMutated`
      // seam, which would open its own separate transaction.
      await withOptionalTransaction(async (session) => {
        const opts = session ? { session } : {};
        if (childModel) {
          await childModel.updateMany({ parent_id: id }, { $set: { parent_id: null } }, opts);
        }
        await model.deleteOne({ _id: id }, opts);
        if (prevParentId && parentType) {
          await cascadeWithin(parentType, prevParentId, session);
        }
      });
    },
  };
}
