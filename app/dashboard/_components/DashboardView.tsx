"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddTaskButton } from "@/components/AddTaskButton";
import { ProgressBar } from "@/components/ProgressBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { STATUS_ICON, IconCheckSquare } from "@/components/icons";
import type { Status } from "@/lib/validation";
import { useEntityList } from "@/lib/queries/entities";
import type { EntityType } from "@/lib/queries/types";
import {
  useMonthlyDashboard,
  useWeeklyDashboard,
  useYearlyDashboard,
  type ChildProgress,
} from "@/lib/queries/dashboard";
import {
  currentIsoWeekRange,
  currentMonthRange,
  currentYearRange,
  type DateRange,
} from "../_lib/date";
import { PeriodCard } from "./PeriodCard";

/** One hierarchy level: a period range + the entity chosen for inspection. */
function usePeriodLevel(type: EntityType, defaultRange: DateRange) {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [picked, setPicked] = useState<string | null>(null);

  const list = useEntityList(type, { from: range.start, to: range.end });
  const options = useMemo(
    () => (list.data ?? []).map((e) => ({ id: e.id, title: e.title })),
    [list.data],
  );

  // Explicit pick wins; otherwise auto-pick the first entity overlapping the period.
  const pickedStillValid = picked != null && options.some((o) => o.id === picked);
  const selectedId = pickedStillValid ? picked : (options[0]?.id ?? null);

  return {
    range,
    setRange,
    picked: pickedStillValid ? picked : null,
    setPicked,
    options,
    selectedId,
    listLoading: list.isLoading,
  };
}

const STATUS_LABEL: Record<Status, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

const STATUS_STYLE: Record<Status, string> = {
  todo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  doing: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

function asStatus(value: string): Status {
  return value in STATUS_LABEL ? (value as Status) : "todo";
}

/** Status chip: the same empty/half/ticked circle the board cards use. */
function StatusPill({ status }: { status: string }) {
  const s = asStatus(status);
  const Icon = STATUS_ICON[s];
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[s]}`}
    >
      <Icon className="size-3" />
      {STATUS_LABEL[s]}
    </span>
  );
}

/** Summary count chip on the weekly card. */
function CountPill({ status, count }: { status: Status; count: number }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${STATUS_STYLE[status]}`}
    >
      <Icon className="size-3" />
      {STATUS_LABEL[status]} {count}
    </span>
  );
}

function ChildRow({ child }: { child: ChildProgress }) {
  return (
    <li className="flex flex-col gap-1 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {child.title}
      </span>
      <ProgressBar value={child.progress} label={`${child.title} 진행률`} />
    </li>
  );
}

export function DashboardView() {
  const defaults = useMemo(
    () => ({
      week: currentIsoWeekRange(),
      month: currentMonthRange(),
      year: currentYearRange(),
    }),
    [],
  );

  const weekLevel = usePeriodLevel("weekly-plans", defaults.week);
  const monthLevel = usePeriodLevel("monthly-goals", defaults.month);
  const yearLevel = usePeriodLevel("yearly-goals", defaults.year);

  const weeklyDash = useWeeklyDashboard(weekLevel.selectedId);
  const monthlyDash = useMonthlyDashboard(monthLevel.selectedId);
  const yearlyDash = useYearlyDashboard(yearLevel.selectedId);

  const unassigned = useEntityList("daily-tasks", { unassigned: true });

  const summary = weeklyDash.data?.taskSummary;

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">대시보드</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              주간 = 완료 비율, 월간 = 하위 주간 평균, 연간 = 하위 월간 평균.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="flex gap-3 text-sm text-emerald-600 dark:text-emerald-400">
              <Link href="/hierarchy" className="hover:underline">
                계층
              </Link>
              <Link href="/board" className="hover:underline">
                보드
              </Link>
            </nav>
            <AddTaskButton />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <PeriodCard
            title="주간"
            entityType="weekly-plans"
            range={weekLevel.range}
            onRangeChange={weekLevel.setRange}
            options={weekLevel.options}
            selectedId={weekLevel.selectedId}
            picked={weekLevel.picked}
            onPick={weekLevel.setPicked}
            listLoading={weekLevel.listLoading}
            detailLoading={weeklyDash.isLoading && weekLevel.selectedId != null}
            detailError={weeklyDash.isError}
            progress={weeklyDash.data ? weeklyDash.data.weekly.progress : null}
          >
            {summary && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                <CountPill status="todo" count={summary.todo} />
                <CountPill status="doing" count={summary.doing} />
                <CountPill status="done" count={summary.done} />
                <span className="flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <IconCheckSquare className="size-3" />
                  전체 {summary.total}
                </span>
              </div>
            )}
            {weeklyDash.data && weeklyDash.data.tasks.length > 0 && (
              <ul className="flex flex-col gap-1">
                {weeklyDash.data.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                      {t.title}
                    </span>
                    <StatusPill status={t.status} />
                  </li>
                ))}
              </ul>
            )}
            {weeklyDash.data && weeklyDash.data.tasks.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                하위 할 일이 없습니다.
              </p>
            )}
          </PeriodCard>

          <PeriodCard
            title="월간"
            entityType="monthly-goals"
            range={monthLevel.range}
            onRangeChange={monthLevel.setRange}
            options={monthLevel.options}
            selectedId={monthLevel.selectedId}
            picked={monthLevel.picked}
            onPick={monthLevel.setPicked}
            listLoading={monthLevel.listLoading}
            detailLoading={monthlyDash.isLoading && monthLevel.selectedId != null}
            detailError={monthlyDash.isError}
            progress={monthlyDash.data ? monthlyDash.data.monthly.progress : null}
          >
            {monthlyDash.data && monthlyDash.data.weeklies.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {monthlyDash.data.weeklies.map((w) => (
                  <ChildRow key={w.id} child={w} />
                ))}
              </ul>
            )}
            {monthlyDash.data && monthlyDash.data.weeklies.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                하위 주간 계획이 없습니다.
              </p>
            )}
          </PeriodCard>

          <PeriodCard
            title="연간"
            entityType="yearly-goals"
            range={yearLevel.range}
            onRangeChange={yearLevel.setRange}
            options={yearLevel.options}
            selectedId={yearLevel.selectedId}
            picked={yearLevel.picked}
            onPick={yearLevel.setPicked}
            listLoading={yearLevel.listLoading}
            detailLoading={yearlyDash.isLoading && yearLevel.selectedId != null}
            detailError={yearlyDash.isError}
            progress={yearlyDash.data ? yearlyDash.data.yearly.progress : null}
          >
            {yearlyDash.data && yearlyDash.data.monthlies.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {yearlyDash.data.monthlies.map((m) => (
                  <ChildRow key={m.id} child={m} />
                ))}
              </ul>
            )}
            {yearlyDash.data && yearlyDash.data.monthlies.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                하위 월간 목표가 없습니다.
              </p>
            )}
          </PeriodCard>
        </div>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <IconCheckSquare className="size-4 text-zinc-400 dark:text-zinc-500" />
                미분류 할 일
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                상위 주간 계획에 연결되지 않은 할 일 (진행률 계산에서 제외).
              </p>
            </div>
            <AddTaskButton size="sm" variant="ghost" testId="add-task-unassigned" />
          </div>
          {unassigned.isLoading && (
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              불러오는 중...
            </p>
          )}
          {unassigned.isError && (
            <p className="mt-3 text-xs text-red-500 dark:text-red-400">
              목록을 불러오지 못했습니다.
            </p>
          )}
          {unassigned.data && unassigned.data.length === 0 && (
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              미분류 할 일이 없습니다.
            </p>
          )}
          {unassigned.data && unassigned.data.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {unassigned.data.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {t.title}
                  </span>
                  <StatusPill status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
