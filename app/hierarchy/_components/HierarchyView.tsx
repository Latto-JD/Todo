"use client";

import { useState } from "react";
import Link from "next/link";
import { useEntityList } from "@/lib/queries";
import { EntityColumn } from "./EntityColumn";

function WeeklyExtra({ weeklyId }: { weeklyId: string }) {
  const { data } = useEntityList("daily-tasks", { parent_id: weeklyId });
  const total = data?.length ?? 0;
  const done = data?.filter((t) => t.status === "done").length ?? 0;
  return (
    <span className="flex items-center gap-2">
      <span>
        할 일 {done}/{total}
      </span>
      <Link
        href={{ pathname: "/board", query: { parent_id: weeklyId } }}
        className="text-emerald-600 hover:underline"
      >
        보드 열기 →
      </Link>
    </span>
  );
}

export function HierarchyView() {
  const [selectedYearly, setSelectedYearly] = useState<string | null>(null);
  const [selectedMonthly, setSelectedMonthly] = useState<string | null>(null);

  function selectYearly(id: string) {
    setSelectedYearly((prev) => (prev === id ? null : id));
    setSelectedMonthly(null);
  }

  function selectMonthly(id: string) {
    setSelectedMonthly((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold">목표 계층</h1>
            <p className="mt-1 text-sm text-zinc-600">
              1년 목표 → 월간 목표 → 주간 계획 순으로 선택해 하위 항목을
              탐색하세요.
            </p>
          </div>
          <Link href="/" className="text-sm text-emerald-600 hover:underline">
            홈
          </Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <EntityColumn
              type="yearly-goals"
              title="1년 목표"
              selectedId={selectedYearly}
              onSelect={selectYearly}
              showProgress
            />
          </div>

          <div className="flex flex-col gap-4">
            <EntityColumn
              type="monthly-goals"
              title="월간 목표"
              params={
                selectedYearly ? { parent_id: selectedYearly } : undefined
              }
              enabled={selectedYearly != null}
              disabledHint="1년 목표를 선택하세요."
              parentId={selectedYearly}
              selectedId={selectedMonthly}
              onSelect={selectMonthly}
              showProgress
            />
            <EntityColumn
              type="monthly-goals"
              title="미분류 월간 목표"
              params={{ unassigned: true }}
              parentId={null}
              selectedId={selectedMonthly}
              onSelect={selectMonthly}
              showProgress
            />
          </div>

          <div className="flex flex-col gap-4">
            <EntityColumn
              type="weekly-plans"
              title="주간 계획"
              params={
                selectedMonthly ? { parent_id: selectedMonthly } : undefined
              }
              enabled={selectedMonthly != null}
              disabledHint="월간 목표를 선택하세요."
              parentId={selectedMonthly}
              showProgress
              renderExtra={(w) => <WeeklyExtra weeklyId={w.id} />}
            />
            <EntityColumn
              type="weekly-plans"
              title="미분류 주간 계획"
              params={{ unassigned: true }}
              parentId={null}
              showProgress
              renderExtra={(w) => <WeeklyExtra weeklyId={w.id} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
