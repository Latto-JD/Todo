"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
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

const STATUS_LABEL: Record<string, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

const STATUS_STYLE: Record<string, string> = {
  todo: "bg-zinc-100 text-zinc-600",
  doing: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

function ChildRow({ child }: { child: ChildProgress }) {
  return (
    <li className="flex flex-col gap-1 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5">
      <span className="truncate text-xs font-medium text-zinc-700">{child.title}</span>
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
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold">대시보드</h1>
            <p className="mt-1 text-sm text-zinc-600">
              주간 = 완료 비율, 월간 = 하위 주간 평균, 연간 = 하위 월간 평균.
            </p>
          </div>
          <nav className="flex gap-3 text-sm text-emerald-600">
            <Link href="/hierarchy" className="hover:underline">
              계층
            </Link>
            <Link href="/board" className="hover:underline">
              보드
            </Link>
          </nav>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <PeriodCard
            title="주간"
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
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                  할 일 {summary.todo}
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                  진행 중 {summary.doing}
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
                  완료 {summary.done}
                </span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                  전체 {summary.total}
                </span>
              </div>
            )}
            {weeklyDash.data && weeklyDash.data.tasks.length > 0 && (
              <ul className="flex flex-col gap-1">
                {weeklyDash.data.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5"
                  >
                    <span className="truncate text-xs text-zinc-700">{t.title}</span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        STATUS_STYLE[t.status] ?? STATUS_STYLE.todo
                      }`}
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {weeklyDash.data && weeklyDash.data.tasks.length === 0 && (
              <p className="text-xs text-zinc-400">하위 할 일이 없습니다.</p>
            )}
          </PeriodCard>

          <PeriodCard
            title="월간"
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
              <p className="text-xs text-zinc-400">하위 주간 계획이 없습니다.</p>
            )}
          </PeriodCard>

          <PeriodCard
            title="연간"
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
              <p className="text-xs text-zinc-400">하위 월간 목표가 없습니다.</p>
            )}
          </PeriodCard>
        </div>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold text-zinc-900">미분류 할 일</h2>
          <p className="mt-1 text-xs text-zinc-500">
            상위 주간 계획에 연결되지 않은 할 일 (진행률 계산에서 제외).
          </p>
          {unassigned.isLoading && (
            <p className="mt-3 text-xs text-zinc-400">불러오는 중...</p>
          )}
          {unassigned.isError && (
            <p className="mt-3 text-xs text-red-500">목록을 불러오지 못했습니다.</p>
          )}
          {unassigned.data && unassigned.data.length === 0 && (
            <p className="mt-3 text-xs text-zinc-400">미분류 할 일이 없습니다.</p>
          )}
          {unassigned.data && unassigned.data.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {unassigned.data.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5"
                >
                  <span className="truncate text-sm text-zinc-700">{t.title}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLE[t.status] ?? STATUS_STYLE.todo
                    }`}
                  >
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
