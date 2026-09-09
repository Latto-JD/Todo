"use client";

import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import type { DateRange } from "../_lib/date";

export interface EntityOption {
  id: string;
  title: string;
}

interface PeriodCardProps {
  title: string;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  options: EntityOption[];
  selectedId: string | null;
  /** Explicit user pick (null = auto-pick first overlapping entity). */
  picked: string | null;
  onPick: (id: string | null) => void;
  listLoading: boolean;
  detailLoading: boolean;
  detailError: boolean;
  /** Denormalised progress of the selected entity, or null when nothing is selected. */
  progress: number | null;
  /** Child breakdown rows. */
  children?: ReactNode;
}

export function PeriodCard({
  title,
  range,
  onRangeChange,
  options,
  selectedId,
  picked,
  onPick,
  listLoading,
  detailLoading,
  detailError,
  progress,
  children,
}: PeriodCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {progress != null && (
          <span className="text-sm font-medium tabular-nums text-emerald-700">
            {Math.round(progress)}%
          </span>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
        <label className="flex items-center gap-1">
          <span className="sr-only">기간 시작</span>
          <input
            type="date"
            value={range.start}
            onChange={(e) => onRangeChange({ ...range, start: e.target.value })}
            className="rounded border border-zinc-300 px-1.5 py-1"
          />
        </label>
        <span>~</span>
        <label className="flex items-center gap-1">
          <span className="sr-only">기간 종료</span>
          <input
            type="date"
            value={range.end}
            onChange={(e) => onRangeChange({ ...range, end: e.target.value })}
            className="rounded border border-zinc-300 px-1.5 py-1"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        <span>
          대상 선택
          {picked == null && selectedId != null && (
            <span className="ml-1 text-zinc-400">(자동 선택)</span>
          )}
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) => onPick(e.target.value || null)}
          disabled={options.length === 0}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 disabled:bg-zinc-100"
        >
          {options.length === 0 && (
            <option value="">이 기간에 해당하는 항목 없음</option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </label>

      {listLoading && <p className="text-xs text-zinc-400">목록 불러오는 중...</p>}

      {progress != null && (
        <ProgressBar value={progress} label={`${title} 진행률`} />
      )}

      {detailLoading && <p className="text-xs text-zinc-400">불러오는 중...</p>}
      {detailError && (
        <p className="text-xs text-red-500">상세 정보를 불러오지 못했습니다.</p>
      )}

      {children}
    </section>
  );
}
