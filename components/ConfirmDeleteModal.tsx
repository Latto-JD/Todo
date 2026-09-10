"use client";

interface ConfirmDeleteModalProps {
  open: boolean;
  itemName: string;
  title?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  open,
  itemName,
  title,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "삭제 확인"}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title ?? "삭제하시겠습니까?"}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {itemName}
          </span>{" "}
          항목을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:hover:bg-red-500"
          >
            {busy ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
