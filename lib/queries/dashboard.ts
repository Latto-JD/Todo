"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type {
  DailyTaskEntity,
  MonthlyGoalEntity,
  WeeklyPlanEntity,
  YearlyGoalEntity,
} from "./types";

/**
 * Read-only dashboard queries (US-007). These live outside the `lib/queries`
 * barrel on purpose — import them directly:
 *   import { useWeeklyDashboard } from "@/lib/queries/dashboard";
 *
 * Each hook mirrors a `GET /api/dashboard/*` route. No mutations: the numbers
 * shown are the denormalised `progress` fields m4's cascade keeps current.
 */

export interface TaskStatusSummary {
  todo: number;
  doing: number;
  done: number;
  total: number;
}

export interface WeeklyDashboard {
  weekly: WeeklyPlanEntity;
  tasks: DailyTaskEntity[];
  taskSummary: TaskStatusSummary;
}

export interface ChildProgress {
  id: string;
  title: string;
  progress: number;
}

export interface MonthlyDashboard {
  monthly: MonthlyGoalEntity;
  weeklies: ChildProgress[];
}

export interface YearlyDashboard {
  yearly: YearlyGoalEntity;
  monthlies: ChildProgress[];
}

const isEnabled = (id: string | null | undefined): id is string =>
  id != null && id !== "";

export function useWeeklyDashboard(
  id: string | null | undefined,
): UseQueryResult<WeeklyDashboard> {
  return useQuery({
    queryKey: ["dashboard", "weekly", id ?? ""],
    queryFn: () =>
      apiGet<WeeklyDashboard>(`/api/dashboard/weekly/${encodeURIComponent(id ?? "")}`),
    enabled: isEnabled(id),
  });
}

export function useMonthlyDashboard(
  id: string | null | undefined,
): UseQueryResult<MonthlyDashboard> {
  return useQuery({
    queryKey: ["dashboard", "monthly", id ?? ""],
    queryFn: () =>
      apiGet<MonthlyDashboard>(`/api/dashboard/monthly/${encodeURIComponent(id ?? "")}`),
    enabled: isEnabled(id),
  });
}

export function useYearlyDashboard(
  id: string | null | undefined,
): UseQueryResult<YearlyDashboard> {
  return useQuery({
    queryKey: ["dashboard", "yearly", id ?? ""],
    queryFn: () =>
      apiGet<YearlyDashboard>(`/api/dashboard/yearly/${encodeURIComponent(id ?? "")}`),
    enabled: isEnabled(id),
  });
}
