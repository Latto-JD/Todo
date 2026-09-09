"use client";

import { useState, type ReactNode } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { EntityForm } from "@/components/EntityForm";
import { useDeleteEntity } from "@/lib/queries";
import type { AnyEntity, EntityByType, EntityType } from "@/lib/queries/types";

interface EntityRowProps<K extends EntityType> {
  type: K;
  entity: EntityByType[K];
  selected?: boolean;
  onSelect?: () => void;
  showProgress?: boolean;
  extra?: ReactNode;
}

export function EntityRow<K extends EntityType>({
  type,
  entity,
  selected,
  onSelect,
  showProgress,
  extra,
}: EntityRowProps<K>) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteEntity(type);

  const row = entity as AnyEntity & { id: string; title: string };

  return (
    <li
      className={`rounded-md border p-2 text-sm ${
        selected
          ? "border-emerald-500 bg-emerald-50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onSelect}
          disabled={!onSelect}
          className="flex-1 text-left font-medium text-zinc-900 enabled:hover:underline"
        >
          {row.title}
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      {showProgress && typeof row.progress === "number" && (
        <div className="mt-1.5">
          <ProgressBar value={row.progress} label={`${row.title} 진행률`} />
        </div>
      )}

      {extra && <div className="mt-1.5 text-xs text-zinc-500">{extra}</div>}

      {editing && (
        <EntityForm
          entityType={type}
          mode="edit"
          initial={entity}
          onDone={() => setEditing(false)}
        />
      )}

      <ConfirmDeleteModal
        open={confirming}
        itemName={row.title}
        busy={del.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          del.mutate(row.id, {
            onSuccess: () => setConfirming(false),
            onError: () => setConfirming(false),
          })
        }
      />
    </li>
  );
}
