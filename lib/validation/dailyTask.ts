import { z } from "zod";
import {
  baseCreateShape,
  objectIdString,
  parentedQueryShape,
  periodOrderError,
  periodOrderRefinement,
  statusEnum,
} from "./shared";

export const createDailyTask = z
  .object({
    ...baseCreateShape,
    due_date: z.coerce.date().nullable().optional(),
    status: statusEnum.optional(),
    order: z.number().int().optional(),
    parent_id: objectIdString.nullable().optional(),
  })
  .refine(periodOrderRefinement, periodOrderError);

export const updateDailyTask = z
  .object({
    ...baseCreateShape,
    due_date: z.coerce.date().nullable(),
    status: statusEnum,
    order: z.number().int(),
    parent_id: objectIdString.nullable(),
  })
  .partial()
  .refine(periodOrderRefinement, periodOrderError);

export const dailyTaskQuery = z.object({
  ...parentedQueryShape,
  status: statusEnum.optional(),
});

export type CreateDailyTask = z.infer<typeof createDailyTask>;
export type UpdateDailyTask = z.infer<typeof updateDailyTask>;
export type DailyTaskQuery = z.infer<typeof dailyTaskQuery>;
