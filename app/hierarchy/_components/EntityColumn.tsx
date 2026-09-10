"use client";

import { useState, type ReactNode } from "react";
import { EntityForm } from "@/components/EntityForm";
import { ENTITY_ICON, type IconComponent } from "@/components/icons";
import { useEntityList } from "@/lib/queries";
import {
  ENTITY_LABEL,
  type EntityByType,
  type EntityType,
  type ListParams,
} from "@/lib/queries/types";
import { EntityRow } from "./EntityRow";

interface EntityColumnProps<K extends EntityType> {
  type: K;
  title: string;
  params?: ListParams;
  enabled?: boolean;
  disabledHint?: string;
  parentId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showProgress?: boolean;
  renderExtra?: (entity: EntityByType[K]) => ReactNode;
}

export function EntityColumn<K extends EntityType>({
  type,
  title,
  params,
  enabled = true,
  disabledHint,
  parentId,
  selectedId,
  onSelect,
  showProgress,
  renderExtra,
}: EntityColumnProps<K>) {
  const [adding, setAdding] = useState(false);
  const query = useEntityList(type, params, { enabled });
  const rows = query.data ?? [];
  // Annotated: indexing the map with the generic `K` leaves the element type
  // deferred, which JSX will not accept as a component.
  const TypeIcon: IconComponent = ENTITY_ICON[type];

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <TypeIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">{title}</span>
        </h2>
        {enabled && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 rounded border border-emerald-300 px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            ＋ 추가
          </button>
        )}
      </header>

      {!enabled && (
        <p className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          {disabledHint ?? "상위 항목을 먼저 선택하세요."}
        </p>
      )}

      {enabled && query.isLoading && (
        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          불러오는 중...
        </p>
      )}

      {enabled && query.isError && (
        <p className="py-4 text-center text-xs text-red-500 dark:text-red-400">
          목록을 불러오지 못했습니다.
        </p>
      )}

      {enabled && !query.isLoading && !query.isError && rows.length === 0 && (
        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          {ENTITY_LABEL[type]}이(가) 없습니다.
        </p>
      )}

      {enabled && rows.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {rows.map((entity) => (
            <EntityRow
              key={entity.id}
              type={type}
              entity={entity}
              selected={selectedId === entity.id}
              onSelect={onSelect ? () => onSelect(entity.id) : undefined}
              showProgress={showProgress}
              extra={renderExtra?.(entity)}
            />
          ))}
        </ul>
      )}

      {adding && (
        <EntityForm
          entityType={type}
          mode="create"
          parentId={parentId ?? undefined}
          onDone={() => setAdding(false)}
        />
      )}
    </section>
  );
}
