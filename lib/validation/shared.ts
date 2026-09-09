import { z } from "zod";

/** Domain status enum — single source of truth, mirrored by the Mongoose enum. */
export const statusEnum = z.enum(["todo", "doing", "done"]);
export type Status = z.infer<typeof statusEnum>;

/** A 24-character hex string that maps to a Mongo ObjectId. */
export const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "must be a 24-character hex ObjectId");

/** Query-string booleans: accepts real booleans or the literal strings "true"/"false". */
export const booleanish = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((v) => v === true || v === "true");

/** Create-time fields common to every entity. Dates accepted as ISO strings, coerced to Date. */
export const baseCreateShape = {
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
};

/**
 * Cross-field rule: period_end >= period_start.
 * Passes when either bound is absent, so it is safe on `.partial()` update schemas.
 */
export const periodOrderRefinement = (data: {
  period_start?: Date;
  period_end?: Date;
}): boolean =>
  data.period_start == null ||
  data.period_end == null ||
  data.period_end.getTime() >= data.period_start.getTime();

export const periodOrderError = {
  message: "period_end must be greater than or equal to period_start",
  path: ["period_end"] as (string | number)[],
};

/** Base list-query fields for entities that live in the parent chain. */
export const parentedQueryShape = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  parent_id: objectIdString.optional(),
  unassigned: booleanish.optional(),
};
