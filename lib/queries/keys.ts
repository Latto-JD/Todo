import type { EntityType, ListParams } from "./types";

/**
 * Query key factory. Every key is prefixed by the entity type so a single
 * `invalidateQueries({ queryKey: keys.all(type) })` clears its lists and details.
 */
export const keys = {
  all: (type: EntityType) => [type] as const,
  lists: (type: EntityType) => [type, "list"] as const,
  list: (type: EntityType, params?: ListParams) =>
    [type, "list", params ?? {}] as const,
  details: (type: EntityType) => [type, "detail"] as const,
  detail: (type: EntityType, id: string) => [type, "detail", id] as const,
};
