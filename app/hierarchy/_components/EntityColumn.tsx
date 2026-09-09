"use client";

import { useState, type ReactNode } from "react";
import { EntityForm } from "@/components/EntityForm";
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

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        {enabled && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded border border-emerald-300 px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            ＋ 추가
          </button>
        )}
      </header>

      {!enabled && (
        <p className="py-6 text-center text-xs text-zinc-400">
          {disabledHint ?? "상위 항목을 먼저 선택하세요."}
        </p>
      )}

      {enabled && query.isLoading && (
        <p className="py-4 text-center text-xs text-zinc-400">불러오는 중...</p>
      )}

      {enabled && query.isError && (
        <p className="py-4 text-center text-xs text-red-500">
          목록을 불러오지 못했습니다.
        </p>
      )}

      {enabled && !query.isLoading && !query.isError && rows.length === 0 && (
        <p className="py-4 text-center text-xs text-zinc-400">
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
