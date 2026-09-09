import { MonthlyGoal, WeeklyPlan, YearlyGoal } from "@/lib/models";
import { makeService } from "./shared";

/**
 * The three parent-chain entities need no behaviour beyond the generic CRUD
 * service, so they are declared here rather than in a file each. `DailyTask`
 * keeps its own module because it adds `completed_at` reconciliation and
 * `order` assignment.
 */
export const weeklyPlanService = makeService(WeeklyPlan, "WeeklyPlan");
export const monthlyGoalService = makeService(MonthlyGoal, "MonthlyGoal");
export const yearlyGoalService = makeService(YearlyGoal, "YearlyGoal");

export { dailyTaskService } from "./dailyTaskService";
export { onEntityMutated } from "./progressHook";
export type { EntityType, EntityMutationOpts } from "./progressHook";
export type { ListQuery, EntityJSON } from "./shared";
