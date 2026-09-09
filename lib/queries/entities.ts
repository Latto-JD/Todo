"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { toast } from "@/components/Toast";
import { keys } from "./keys";
import type {
  CreateByType,
  EntityByType,
  EntityType,
  ListParams,
  UpdateByType,
} from "./types";

function listPath(type: EntityType, params?: ListParams): string {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.parent_id) qs.set("parent_id", params.parent_id);
  if (params?.unassigned) qs.set("unassigned", "true");
  if (params?.status) qs.set("status", params.status);
  const s = qs.toString();
  return `/api/${type}${s ? `?${s}` : ""}`;
}

/** Human-readable message for a failed request, folding in server 400 `details`. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const detail = flattenDetails(err.details);
    return detail ? `${err.message} (${detail})` : err.message;
  }
  return err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
}

function flattenDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const source =
    "fieldErrors" in details &&
    typeof (details as { fieldErrors: unknown }).fieldErrors === "object"
      ? (details as { fieldErrors: Record<string, unknown> }).fieldErrors
      : (details as Record<string, unknown>);
  const messages = Object.values(source)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === "string");
  return messages.length ? messages.join(", ") : null;
}

/** Field -> message map extracted from a server 400 for inline form errors. */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiClientError) || !err.details || typeof err.details !== "object") {
    return {};
  }
  const raw = err.details as Record<string, unknown>;
  const source =
    "fieldErrors" in raw && typeof raw.fieldErrors === "object"
      ? (raw.fieldErrors as Record<string, unknown>)
      : raw;
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(source)) {
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") out[field] = message;
  }
  return out;
}

export function useEntityList<K extends EntityType>(
  type: K,
  params?: ListParams,
  options?: { enabled?: boolean },
): UseQueryResult<EntityByType[K][]> {
  return useQuery({
    queryKey: keys.list(type, params),
    queryFn: () => apiGet<EntityByType[K][]>(listPath(type, params)),
    enabled: options?.enabled ?? true,
  });
}

export function useEntity<K extends EntityType>(
  type: K,
  id: string | null | undefined,
): UseQueryResult<EntityByType[K]> {
  return useQuery({
    queryKey: keys.detail(type, id ?? ""),
    queryFn: () => apiGet<EntityByType[K]>(`/api/${type}/${id}`),
    enabled: id != null && id !== "",
  });
}

/**
 * Mutations invalidate every query on success: a write to one entity can shift a
 * parent's `progress` several levels up, so a broad refetch keeps the tree honest.
 */
export function useCreateEntity<K extends EntityType>(type: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateByType[K]) =>
      apiPost<EntityByType[K]>(`/api/${type}`, data),
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("생성되었습니다.");
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });
}

export function useUpdateEntity<K extends EntityType>(type: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: UpdateByType[K] }) =>
      apiPatch<EntityByType[K]>(`/api/${type}/${vars.id}`, vars.data),
    onSuccess: (updated) => {
      void qc.invalidateQueries();
      qc.setQueryData(keys.detail(type, updated.id), updated);
      toast.success("수정되었습니다.");
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });
}

export function useDeleteEntity<K extends EntityType>(type: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/${type}/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("삭제되었습니다.");
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });
}
