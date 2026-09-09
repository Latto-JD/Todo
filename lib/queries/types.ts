import type {
  CreateDailyTask,
  UpdateDailyTask,
  CreateWeeklyPlan,
  UpdateWeeklyPlan,
  CreateMonthlyGoal,
  UpdateMonthlyGoal,
  CreateYearlyGoal,
  UpdateYearlyGoal,
  Status,
} from "@/lib/validation";

/** URL path segment for each entity, matching the Route Handler folders. */
export type EntityType =
  | "daily-tasks"
  | "weekly-plans"
  | "monthly-goals"
  | "yearly-goals";

/**
 * Wire shape of an entity as serialized by the models' `toJSON` transform:
 * `_id` -> `id` (string), dates as ISO strings.
 * Kept as a plain type here because the Mongoose `InferSchemaType` carries
 * `Date`/`ObjectId` values that never survive the JSON round-trip.
 */
export interface BaseEntity {
  id: string;
  title: string;
  description: string;
  period_start: string;
  period_end: string;
  createdAt: string;
  updatedAt: string;
}

export interface YearlyGoalEntity extends BaseEntity {
  progress: number;
}

export interface MonthlyGoalEntity extends BaseEntity {
  progress: number;
  parent_id: string | null;
}

export interface WeeklyPlanEntity extends BaseEntity {
  progress: number;
  parent_id: string | null;
}

export interface DailyTaskEntity extends BaseEntity {
  status: Status;
  completed_at: string | null;
  order: number;
  due_date: string | null;
  parent_id: string | null;
}

export interface EntityByType {
  "daily-tasks": DailyTaskEntity;
  "weekly-plans": WeeklyPlanEntity;
  "monthly-goals": MonthlyGoalEntity;
  "yearly-goals": YearlyGoalEntity;
}

export interface CreateByType {
  "daily-tasks": CreateDailyTask;
  "weekly-plans": CreateWeeklyPlan;
  "monthly-goals": CreateMonthlyGoal;
  "yearly-goals": CreateYearlyGoal;
}

export interface UpdateByType {
  "daily-tasks": UpdateDailyTask;
  "weekly-plans": UpdateWeeklyPlan;
  "monthly-goals": UpdateMonthlyGoal;
  "yearly-goals": UpdateYearlyGoal;
}

/** Loose superset of every entity, for the shared `EntityForm`. */
export type AnyEntity = Partial<
  DailyTaskEntity & WeeklyPlanEntity & MonthlyGoalEntity & YearlyGoalEntity
>;

export interface ListParams {
  from?: string;
  to?: string;
  parent_id?: string;
  unassigned?: boolean;
  status?: Status;
}

/** Parent entity type for each level of the hierarchy chain. */
export const PARENT_TYPE: Partial<Record<EntityType, EntityType>> = {
  "daily-tasks": "weekly-plans",
  "weekly-plans": "monthly-goals",
  "monthly-goals": "yearly-goals",
};

export const ENTITY_LABEL: Record<EntityType, string> = {
  "daily-tasks": "할 일",
  "weekly-plans": "주간 계획",
  "monthly-goals": "월간 목표",
  "yearly-goals": "1년 목표",
};
