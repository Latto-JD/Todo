"use client";

import { useMemo, useState, type FormEvent } from "react";
import { statusEnum, type Status } from "@/lib/validation";
import { ENTITY_ICON } from "@/components/icons";
import {
  fieldErrorsFrom,
  useCreateEntity,
  useEntityList,
  useUpdateEntity,
} from "@/lib/queries";
import {
  ENTITY_LABEL,
  PARENT_TYPE,
  type AnyEntity,
  type CreateByType,
  type EntityType,
  type UpdateByType,
} from "@/lib/queries/types";

interface EntityFormProps {
  entityType: EntityType;
  mode: "create" | "edit";
  initial?: AnyEntity;
  parentId?: string | null;
  onDone: () => void;
}

const STATUS_LABEL: Record<Status, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Local (not UTC) `YYYY-MM-DD`, so "today" matches the user's calendar. */
function todayInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function EntityForm({
  entityType,
  mode,
  initial,
  parentId,
  onDone,
}: EntityFormProps) {
  const parentType = PARENT_TYPE[entityType];
  const isDaily = entityType === "daily-tasks";

  const parentQuery = useEntityList(
    parentType ?? "yearly-goals",
    undefined,
    { enabled: parentType != null },
  );

  // A new task is almost always for today, and the header button can be pressed
  // from any screen — so prefill its period instead of making that the first
  // thing to fill in. The three levels above it span deliberate ranges, so they
  // keep starting empty.
  const defaultPeriod = mode === "create" && isDaily ? todayInput() : "";

  const [form, setForm] = useState(() => ({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    period_start: toDateInput(initial?.period_start) || defaultPeriod,
    period_end: toDateInput(initial?.period_end) || defaultPeriod,
    due_date: toDateInput(initial?.due_date),
    status: (initial?.status as Status | undefined) ?? "todo",
    parent_id: initial?.parent_id ?? parentId ?? "",
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateEntity(entityType);
  const updateMutation = useUpdateEntity(entityType);
  const busy = createMutation.isPending || updateMutation.isPending;

  const clientErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "제목을 입력하세요.";
    if (!form.period_start) errs.period_start = "시작일을 입력하세요.";
    if (!form.period_end) errs.period_end = "종료일을 입력하세요.";
    if (
      form.period_start &&
      form.period_end &&
      form.period_end < form.period_start
    ) {
      errs.period_end = "종료일은 시작일 이후여야 합니다.";
    }
    return errs;
  }, [form]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      period_start: form.period_start,
      period_end: form.period_end,
    };
    if (isDaily) {
      payload.due_date = form.due_date || null;
      payload.status = form.status;
      payload.parent_id = form.parent_id || null;
    } else if (parentType) {
      payload.parent_id = form.parent_id || null;
    }
    return payload;
  }

  function handleServerError(err: unknown) {
    const fields = fieldErrorsFrom(err);
    if (Object.keys(fields).length) setServerErrors(fields);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(clientErrors).length) return;

    const payload = buildPayload();
    if (mode === "create") {
      createMutation.mutate(payload as CreateByType[EntityType], {
        onError: handleServerError,
        onSuccess: () => onDone(),
      });
    } else if (initial?.id) {
      updateMutation.mutate(
        { id: initial.id, data: payload as UpdateByType[EntityType] },
        { onError: handleServerError, onSuccess: () => onDone() },
      );
    }
  }

  const errorFor = (field: string): string | undefined =>
    serverErrors[field] ?? (showErrors ? clientErrors[field] : undefined);

  const parentOptions = parentQuery.data ?? [];
  const heading = `${ENTITY_LABEL[entityType]} ${mode === "create" ? "추가" : "수정"}`;
  const HeadingIcon = ENTITY_ICON[entityType];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <HeadingIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          {heading}
        </h2>

        <Field label="제목" error={errorFor("title")}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="설명" error={errorFor("description")}>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>

        <div className="flex gap-3">
          <Field label="시작일" error={errorFor("period_start")}>
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => set("period_start", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="종료일" error={errorFor("period_end")}>
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => set("period_end", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {isDaily && (
          <div className="flex gap-3">
            <Field label="마감일" error={errorFor("due_date")}>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="상태" error={errorFor("status")}>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as Status)}
                className={inputClass}
              >
                {statusEnum.options.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {parentType && (
          <Field
            label={`상위 ${ENTITY_LABEL[parentType]}`}
            error={errorFor("parent_id")}
          >
            <select
              value={form.parent_id}
              onChange={(e) => set("parent_id", e.target.value)}
              className={inputClass}
            >
              <option value="">미분류</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-500"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-emerald-500";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {label}
      {children}
      {error && (
        <span className="font-normal text-red-600 dark:text-red-400">{error}</span>
      )}
    </label>
  );
}
