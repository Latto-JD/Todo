import { z } from "zod";
import { baseCreateShape, periodOrderError, periodOrderRefinement } from "./shared";

export const createYearlyGoal = z
  .object({ ...baseCreateShape })
  .refine(periodOrderRefinement, periodOrderError);

export const updateYearlyGoal = z
  .object({ ...baseCreateShape })
  .partial()
  .refine(periodOrderRefinement, periodOrderError);

export const yearlyGoalQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateYearlyGoal = z.infer<typeof createYearlyGoal>;
export type UpdateYearlyGoal = z.infer<typeof updateYearlyGoal>;
export type YearlyGoalQuery = z.infer<typeof yearlyGoalQuery>;
