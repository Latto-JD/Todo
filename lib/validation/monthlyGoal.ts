import { z } from "zod";
import {
  baseCreateShape,
  objectIdString,
  parentedQueryShape,
  periodOrderError,
  periodOrderRefinement,
} from "./shared";

export const createMonthlyGoal = z
  .object({
    ...baseCreateShape,
    parent_id: objectIdString.nullable().optional(),
  })
  .refine(periodOrderRefinement, periodOrderError);

export const updateMonthlyGoal = z
  .object({
    ...baseCreateShape,
    parent_id: objectIdString.nullable(),
  })
  .partial()
  .refine(periodOrderRefinement, periodOrderError);

export const monthlyGoalQuery = z.object({ ...parentedQueryShape });

export type CreateMonthlyGoal = z.infer<typeof createMonthlyGoal>;
export type UpdateMonthlyGoal = z.infer<typeof updateMonthlyGoal>;
export type MonthlyGoalQuery = z.infer<typeof monthlyGoalQuery>;
