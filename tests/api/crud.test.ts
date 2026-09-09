// @vitest-environment node
import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { setupTestDb } from "../helpers/mongo";
import { createReq, deleteReq, getReq, listReq, patchReq } from "../helpers/http";

import * as dailyCollection from "@/app/api/daily-tasks/route";
import * as dailyItem from "@/app/api/daily-tasks/[id]/route";
import * as weeklyCollection from "@/app/api/weekly-plans/route";
import * as weeklyItem from "@/app/api/weekly-plans/[id]/route";
import * as monthlyCollection from "@/app/api/monthly-goals/route";
import * as monthlyItem from "@/app/api/monthly-goals/[id]/route";
import * as yearlyCollection from "@/app/api/yearly-goals/route";
import * as yearlyItem from "@/app/api/yearly-goals/[id]/route";

setupTestDb();

const oid = () => new mongoose.Types.ObjectId().toString();

interface EntityCase {
  name: string;
  collection: typeof dailyCollection;
  item: typeof dailyItem;
  /** A valid create payload (period Jan 2026). */
  valid: () => Record<string, unknown>;
  /** Whether this entity accepts a `parent_id`. */
  parented: boolean;
}

const CASES: EntityCase[] = [
  {
    name: "daily-tasks",
    collection: dailyCollection,
    item: dailyItem,
    valid: () => ({ title: "Task", period_start: "2026-01-01", period_end: "2026-01-31" }),
    parented: true,
  },
  {
    name: "weekly-plans",
    collection: weeklyCollection,
    item: weeklyItem,
    valid: () => ({ title: "Week", period_start: "2026-01-01", period_end: "2026-01-31" }),
    parented: true,
  },
  {
    name: "monthly-goals",
    collection: monthlyCollection,
    item: monthlyItem,
    valid: () => ({ title: "Month", period_start: "2026-01-01", period_end: "2026-01-31" }),
    parented: true,
  },
  {
    name: "yearly-goals",
    collection: yearlyCollection,
    item: yearlyItem,
    valid: () => ({ title: "Year", period_start: "2026-01-01", period_end: "2026-12-31" }),
    parented: false,
  },
];

describe.each(CASES)("$name CRUD", (c) => {
  it("POST creates → 201 with id (criterion 1)", async () => {
    const res = await createReq(c.collection, c.valid());
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f]{24}$/);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("POST missing required title → 400 VALIDATION (criterion 1)", async () => {
    const noTitle = c.valid();
    delete noTitle.title;
    const res = await createReq(c.collection, noTitle);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
    expect(res.body.error.details).toBeDefined();
  });

  it("POST period_end < period_start → 400 (criterion 2)", async () => {
    const res = await createReq(c.collection, {
      ...c.valid(),
      period_start: "2026-06-01",
      period_end: "2026-01-01",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("PATCH period_end before period_start → 400 VALIDATION, period unchanged (criterion 2)", async () => {
    const created = await createReq(c.collection, {
      ...c.valid(),
      period_start: "2026-01-10",
      period_end: "2026-01-20",
    });
    expect(created.status).toBe(201);

    const res = await patchReq(c.item, created.body.id, { period_end: "2026-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");

    // The inverted period was rejected before it could persist.
    const after = await getReq(c.item, created.body.id);
    expect(after.status).toBe(200);
    expect(new Date(after.body.period_end).toISOString()).toBe(
      new Date(created.body.period_end).toISOString(),
    );
  });

  it("GET /[id] returns the doc (200); missing → 404 (criterion 4)", async () => {
    const created = await createReq(c.collection, c.valid());
    const ok = await getReq(c.item, created.body.id);
    expect(ok.status).toBe(200);
    expect(ok.body.id).toBe(created.body.id);
    expect(ok.headers.get("cache-control")).toBe("no-store");

    const missing = await getReq(c.item, oid());
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const garbage = await getReq(c.item, "not-an-object-id");
    expect(garbage.status).toBe(404);
  });

  it("GET list returns an array (200)", async () => {
    await createReq(c.collection, c.valid());
    await createReq(c.collection, c.valid());
    const res = await listReq(c.collection);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("PATCH applies only provided fields and advances updatedAt (criterion 3)", async () => {
    const created = await createReq(c.collection, { ...c.valid(), description: "orig" });
    await new Promise((r) => setTimeout(r, 15));

    const res = await patchReq(c.item, created.body.id, { title: "renamed" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("renamed");
    expect(res.body.description).toBe("orig");
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.body.updatedAt).getTime(),
    );
  });

  it("PATCH missing id → 404", async () => {
    const res = await patchReq(c.item, oid(), { title: "x" });
    expect(res.status).toBe(404);
  });

  it("DELETE → 204, then GET → 404 (criterion 4)", async () => {
    const created = await createReq(c.collection, c.valid());
    const del = await deleteReq(c.item, created.body.id);
    expect(del.status).toBe(204);
    expect(del.body).toBeUndefined();

    const after = await getReq(c.item, created.body.id);
    expect(after.status).toBe(404);
  });

  it("DELETE missing id → 404", async () => {
    const res = await deleteReq(c.item, oid());
    expect(res.status).toBe(404);
  });

  it("GET list ?from&to returns only period-overlapping docs (criterion 21)", async () => {
    const jan = await createReq(c.collection, {
      ...c.valid(),
      period_start: "2026-01-01",
      period_end: "2026-01-31",
    });
    const mar = await createReq(c.collection, {
      ...c.valid(),
      period_start: "2026-03-01",
      period_end: "2026-03-31",
    });

    const res = await listReq(
      c.collection,
      `/api/${c.name}?from=2026-01-15T00:00:00.000Z&to=2026-02-15T00:00:00.000Z`,
    );
    expect(res.status).toBe(200);
    const ids = res.body.map((d: { id: string }) => d.id);
    expect(ids).toContain(jan.body.id);
    expect(ids).not.toContain(mar.body.id);
  });

  if (c.parented) {
    it("GET list ?unassigned=true returns only parent_id=null docs (criterion 19)", async () => {
      const parent = oid();
      const assigned = await createReq(c.collection, { ...c.valid(), parent_id: parent });
      const orphan = await createReq(c.collection, { ...c.valid(), parent_id: null });

      const res = await listReq(c.collection, `/api/${c.name}?unassigned=true`);
      expect(res.status).toBe(200);
      const ids = res.body.map((d: { id: string }) => d.id);
      expect(ids).toEqual([orphan.body.id]);
      expect(ids).not.toContain(assigned.body.id);
    });

    it("GET list ?parent_id filters to that parent", async () => {
      const parent = oid();
      const mine = await createReq(c.collection, { ...c.valid(), parent_id: parent });
      await createReq(c.collection, { ...c.valid(), parent_id: oid() });

      const res = await listReq(c.collection, `/api/${c.name}?parent_id=${parent}`);
      expect(res.body.map((d: { id: string }) => d.id)).toEqual([mine.body.id]);
    });
  }
});

describe("daily-tasks status / completed_at", () => {
  const make = (over: Record<string, unknown> = {}) =>
    createReq(dailyCollection, {
      title: "T",
      period_start: "2026-01-01",
      period_end: "2026-01-31",
      ...over,
    });

  it("create with status=done stamps completed_at (criterion 7)", async () => {
    const res = await make({ status: "done" });
    expect(res.status).toBe(201);
    expect(res.body.completed_at).not.toBeNull();
    expect(Number.isNaN(Date.parse(res.body.completed_at))).toBe(false);
  });

  it("todo → doing → done → todo all 200, completed_at set then cleared (criteria 6, 7, 8)", async () => {
    const created = await make();
    const id = created.body.id;
    expect(created.body.completed_at ?? null).toBeNull();

    const doing = await patchReq(dailyItem, id, { status: "doing" });
    expect(doing.status).toBe(200);
    expect(doing.body.completed_at ?? null).toBeNull();

    const done = await patchReq(dailyItem, id, { status: "done" });
    expect(done.status).toBe(200);
    expect(done.body.completed_at).not.toBeNull();

    const backToTodo = await patchReq(dailyItem, id, { status: "todo" });
    expect(backToTodo.status).toBe(200);
    expect(backToTodo.body.completed_at).toBeNull();
  });

  it("GET list ?status= filters by status", async () => {
    await make({ status: "todo" });
    await make({ status: "done" });
    const res = await listReq(dailyCollection, "/api/daily-tasks?status=done");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("done");
  });
});

describe("daily-tasks order defaults to max+1 within a column (PLAN §2.2)", () => {
  const make = (over: Record<string, unknown> = {}) =>
    createReq(dailyCollection, {
      title: "T",
      period_start: "2026-01-01",
      period_end: "2026-01-31",
      ...over,
    });

  it("second task with the same parent + status gets order = first + 1", async () => {
    const parent = oid();
    const first = await make({ parent_id: parent });
    const second = await make({ parent_id: parent });
    expect(first.body.order).toBe(0);
    expect(second.body.order).toBe(first.body.order + 1);
  });

  it("order is scoped per column — a different status restarts at 0", async () => {
    const parent = oid();
    await make({ parent_id: parent, status: "todo" });
    const doing = await make({ parent_id: parent, status: "doing" });
    expect(doing.body.order).toBe(0);
  });

  it("an explicit order is respected", async () => {
    const parent = oid();
    await make({ parent_id: parent });
    const pinned = await make({ parent_id: parent, order: 9 });
    expect(pinned.body.order).toBe(9);
  });
});

describe("parent deletion demotes children (criterion 20)", () => {
  it("deleting a WeeklyPlan re-homes its DailyTasks as unassigned, still queryable", async () => {
    const weekly = await createReq(weeklyCollection, {
      title: "W",
      period_start: "2026-01-01",
      period_end: "2026-01-31",
    });
    const task = await createReq(dailyCollection, {
      title: "child",
      period_start: "2026-01-01",
      period_end: "2026-01-31",
      parent_id: weekly.body.id,
    });

    const del = await deleteReq(weeklyItem, weekly.body.id);
    expect(del.status).toBe(204);

    // The task survives, is now unassigned, and shows up under ?unassigned=true.
    const stillThere = await getReq(dailyItem, task.body.id);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.parent_id ?? null).toBeNull();

    const unassigned = await listReq(dailyCollection, "/api/daily-tasks?unassigned=true");
    expect(unassigned.body.map((d: { id: string }) => d.id)).toContain(task.body.id);
  });
});
