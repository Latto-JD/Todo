import { z } from "zod";
import {
  baseCreateShape,
  objectIdString,
  parentedQueryShape,
  periodOrderError,
  periodOrderRefinement,
} from "./shared";

export const createWeeklyPlan = z
  .object({
    ...baseCreateShape,
    parent_id: objectIdString.nullable().optional(),
  })
  .refine(periodOrderRefinement, periodOrderError);

export const updateWeeklyPlan = z
  .object({
    ...baseCreateShape,
    parent_id: objectIdString.nullable(),
  })
  .partial()
  .refine(periodOrderRefinement, periodOrderError);

export const weeklyPlanQuery = z.object({ ...parentedQueryShape });

export type CreateWeeklyPlan = z.infer<typeof createWeeklyPlan>;
export type UpdateWeeklyPlan = z.infer<typeof updateWeeklyPlan>;
export type WeeklyPlanQuery = z.infer<typeof weeklyPlanQuery>;
