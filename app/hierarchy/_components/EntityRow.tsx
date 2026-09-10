"use client";

import { useState, type ReactNode } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { EntityForm } from "@/components/EntityForm";
import { ENTITY_ICON, type IconComponent } from "@/components/icons";
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
  const TypeIcon: IconComponent = ENTITY_ICON[type];

  return (
    <li
      className={`rounded-md border p-2 text-sm ${
        selected
          ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/50"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/*
          The icon sits beside the button rather than inside it: the title button
          is the accessible handle for selecting this entity, and folding a glyph
          into it would pad the name the e2e specs select it by.
        */}
        <TypeIcon
          className={`mt-0.5 size-4 shrink-0 ${
            selected
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        />
        <button
          type="button"
          onClick={onSelect}
          disabled={!onSelect}
          className="flex-1 text-left font-medium text-zinc-900 enabled:hover:underline dark:text-zinc-100"
        >
          {row.title}
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
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

      {extra && (
        <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {extra}
        </div>
      )}

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
