// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DailyTask, WeeklyPlan, MonthlyGoal } from "@/lib/models";
import { dailyTaskService, weeklyPlanService, monthlyGoalService } from "@/lib/services";
import { recalculate } from "@/lib/services/progressService";
import { moveDailyTask } from "@/lib/services/dailyTaskMove";
import { PATCH as movePATCH } from "@/app/api/daily-tasks/[id]/move/route";
import {
  setupTestDb,
  connectionSupportsTransactions,
  makeYearly,
  makeMonthly,
  makeWeekly,
  makeTask,
  weeklyProgress,
  monthlyProgress,
  yearlyProgress,
} from "../helpers/progressFixtures";

const PERIOD = {
  period_start: "2026-01-01T00:00:00.000Z",
  period_end: "2026-12-31T00:00:00.000Z",
};

setupTestDb();

describe("transaction environment", () => {
  it("runs against a replica set so the transactional path is the one under test", async () => {
    expect(await connectionSupportsTransactions()).toBe(true);
  });
});

/* ================================================================== *
 * docs/PLAN.md §6 — progress test matrix P1..P9
 * ================================================================== */

describe("PLAN §6 progress matrix", () => {
  it("P1: Weekly with 0 tasks, create a todo task → W.progress 0", async () => {
    const weekly = await makeWeekly("W");
    await dailyTaskService.create({ title: "t1", ...PERIOD, parent_id: weekly });

    expect(await weeklyProgress(weekly)).toBe(0);
  });

  it("P2: Weekly with 4 todo tasks, mark 1 done → W.progress 25", async () => {
    const weekly = await makeWeekly("W");
    const ids: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const task = await dailyTaskService.create({ title: `t${i}`, ...PERIOD, parent_id: weekly });
      ids.push(task.id);
    }

    await dailyTaskService.update(ids[0], { status: "done" });

    expect(await weeklyProgress(weekly)).toBe(25);
  });

  it("P3: W.progress 25, move the done task back to todo → W.progress 0", async () => {
    const weekly = await makeWeekly("W");
    const ids: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const task = await dailyTaskService.create({ title: `t${i}`, ...PERIOD, parent_id: weekly });
      ids.push(task.id);
    }
    await dailyTaskService.update(ids[0], { status: "done" });
    expect(await weeklyProgress(weekly)).toBe(25);

    await dailyTaskService.update(ids[0], { status: "todo" });

    expect(await weeklyProgress(weekly)).toBe(0);
  });

  it("P4: Monthly ← W1(50), W2(100) → M.progress 75", async () => {
    const monthly = await makeMonthly("M");
    const w1 = await makeWeekly("W1", monthly);
    const w2 = await makeWeekly("W2", monthly);
    await makeTask("a", w1, "done");
    await makeTask("b", w1, "todo");
    await makeTask("c", w2, "done");

    await recalculate("WeeklyPlan", w1);
    await recalculate("WeeklyPlan", w2);

    expect(await weeklyProgress(w1)).toBe(50);
    expect(await weeklyProgress(w2)).toBe(100);
    expect(await monthlyProgress(monthly)).toBe(75);
  });

  it("P5: Yearly ← M1(0), M2(50), M3(100); recalculating M2 → Y.progress 50", async () => {
    const yearly = await makeYearly("Y");
    const m1 = await makeMonthly("M1", yearly);
    const m2 = await makeMonthly("M2", yearly);
    const m3 = await makeMonthly("M3", yearly);

    const w1 = await makeWeekly("W1", m1);
    await makeTask("a", w1, "todo");
    const w2 = await makeWeekly("W2", m2);
    await makeTask("b", w2, "done");
    await makeTask("c", w2, "todo");
    const w3 = await makeWeekly("W3", m3);
    await makeTask("d", w3, "done");

    // Establish the matrix's initial state: M1 0, M2 50, M3 100.
    for (const weekly of [w1, w2, w3]) await recalculate("WeeklyPlan", weekly);
    await recalculate("MonthlyGoal", m1);
    await recalculate("MonthlyGoal", m3);
    // The matrix's action: a single recalculation trigger on M2.
    await recalculate("MonthlyGoal", m2);

    expect(await monthlyProgress(m1)).toBe(0);
    expect(await monthlyProgress(m2)).toBe(50);
    expect(await monthlyProgress(m3)).toBe(100);
    expect(await yearlyProgress(yearly)).toBe(50);
  });

  it("P6: reparent a task W1 → W2 recalculates W1, W2 and the shared M, Y", async () => {
    const yearly = await makeYearly("Y");
    const monthly = await makeMonthly("M", yearly);
    const w1 = await makeWeekly("W1", monthly);
    const w2 = await makeWeekly("W2", monthly);

    const moved = await dailyTaskService.create({
      title: "moved",
      ...PERIOD,
      status: "done",
      parent_id: w1,
    });
    await dailyTaskService.create({ title: "filler", ...PERIOD, parent_id: w2 });

    expect(await weeklyProgress(w1)).toBe(100);
    expect(await weeklyProgress(w2)).toBe(0);
    expect(await monthlyProgress(monthly)).toBe(50);

    await dailyTaskService.update(moved.id, { parent_id: w2 });

    expect(await weeklyProgress(w1)).toBe(0);
    expect(await weeklyProgress(w2)).toBe(50);
    expect(await monthlyProgress(monthly)).toBe(25);
    expect(await yearlyProgress(yearly)).toBe(25);
  });

  it("P7: Weekly with 3 tasks (1 done), delete a todo task → W.progress 50", async () => {
    const weekly = await makeWeekly("W");
    const done = await dailyTaskService.create({
      title: "done",
      ...PERIOD,
      status: "done",
      parent_id: weekly,
    });
    const todoA = await dailyTaskService.create({ title: "a", ...PERIOD, parent_id: weekly });
    await dailyTaskService.create({ title: "b", ...PERIOD, parent_id: weekly });
    expect(done.status).toBe("done");
    expect(await weeklyProgress(weekly)).toBe(33);

    await dailyTaskService.remove(todoA.id);

    expect(await weeklyProgress(weekly)).toBe(50);
  });

  it("P8: deleting W1 recalculates its Monthly parent", async () => {
    const monthly = await makeMonthly("M");
    const w1 = await makeWeekly("W1", monthly);
    const w2 = await makeWeekly("W2", monthly);
    const orphaned = await dailyTaskService.create({
      title: "child",
      ...PERIOD,
      status: "done",
      parent_id: w1,
    });
    await dailyTaskService.create({ title: "other", ...PERIOD, parent_id: w2 });
    expect(await monthlyProgress(monthly)).toBe(50);

    await weeklyPlanService.remove(w1);

    // Only W2 remains under M → mean of [0] = 0.
    expect(await monthlyProgress(monthly)).toBe(0);
    // W1's task survives the delete and is demoted to unassigned, so it can no
    // longer contribute to any parent's progress.
    const survivor = await DailyTask.findById(orphaned.id);
    expect(survivor).not.toBeNull();
    expect(survivor?.parent_id).toBeNull();
  });

  it("P9: two concurrent done transitions on the same Weekly converge on 100", async () => {
    const weekly = await makeWeekly("W");
    const t1 = await dailyTaskService.create({ title: "t1", ...PERIOD, parent_id: weekly });
    const t2 = await dailyTaskService.create({ title: "t2", ...PERIOD, parent_id: weekly });

    await Promise.all([
      dailyTaskService.update(t1.id, { status: "done" }),
      dailyTaskService.update(t2.id, { status: "done" }),
    ]);

    expect(await weeklyProgress(weekly)).toBe(100);
  });
});

/* ================================================================== *
 * docs/PLAN.md §5 — acceptance criteria 12..20
 * ================================================================== */

describe("PLAN §5 acceptance criteria 12-20", () => {
  it("criterion 12: 4 child tasks with 1 done → WeeklyPlan.progress 25", async () => {
    const weekly = await makeWeekly("W");
    await makeTask("a", weekly, "done");
    await makeTask("b", weekly, "todo");
    await makeTask("c", weekly, "doing");
    await makeTask("d", weekly, "todo");

    await recalculate("WeeklyPlan", weekly);

    expect(await weeklyProgress(weekly)).toBe(25);
  });

  it("criterion 13: WeeklyPlan with 0 child tasks → progress 0", async () => {
    const weekly = await makeWeekly("W");

    await recalculate("WeeklyPlan", weekly);

    expect(await weeklyProgress(weekly)).toBe(0);
  });

  it("criterion 14: MonthlyGoal over Weekly progress [50, 100] → 75", async () => {
    const monthly = await makeMonthly("M");
    await WeeklyPlan.create({
      title: "W1",
      period_start: new Date(PERIOD.period_start),
      period_end: new Date(PERIOD.period_end),
      progress: 50,
      parent_id: monthly,
    });
    await WeeklyPlan.create({
      title: "W2",
      period_start: new Date(PERIOD.period_start),
      period_end: new Date(PERIOD.period_end),
      progress: 100,
      parent_id: monthly,
    });

    await recalculate("MonthlyGoal", monthly);

    expect(await monthlyProgress(monthly)).toBe(75);
  });

  it("criterion 15: YearlyGoal over Monthly progress [0, 50, 100] → 50", async () => {
    const yearly = await makeYearly("Y");
    for (const progress of [0, 50, 100]) {
      const monthly = await makeMonthly(`M${progress}`, yearly);
      await MonthlyGoal.updateOne({ _id: monthly }, { $set: { progress } });
    }

    await recalculate("YearlyGoal", yearly);

    expect(await yearlyProgress(yearly)).toBe(50);
  });

  it("criterion 16: one done transition updates Weekly, Monthly and Yearly in a single call", async () => {
    const yearly = await makeYearly("Y");
    const monthly = await makeMonthly("M", yearly);
    const weekly = await makeWeekly("W", monthly);
    const task = await dailyTaskService.create({ title: "t", ...PERIOD, parent_id: weekly });
    expect(await yearlyProgress(yearly)).toBe(0);

    await dailyTaskService.update(task.id, { status: "done" });

    // Re-queried from the DB, not from the mutation's return value.
    expect(await weeklyProgress(weekly)).toBe(100);
    expect(await monthlyProgress(monthly)).toBe(100);
    expect(await yearlyProgress(yearly)).toBe(100);
  });

  it("criterion 17: reparenting a task A → B recalculates both chains", async () => {
    const yearlyA = await makeYearly("YA");
    const monthlyA = await makeMonthly("MA", yearlyA);
    const weeklyA = await makeWeekly("WA", monthlyA);
    const yearlyB = await makeYearly("YB");
    const monthlyB = await makeMonthly("MB", yearlyB);
    const weeklyB = await makeWeekly("WB", monthlyB);

    const task = await dailyTaskService.create({
      title: "t",
      ...PERIOD,
      status: "done",
      parent_id: weeklyA,
    });
    expect(await yearlyProgress(yearlyA)).toBe(100);
    expect(await yearlyProgress(yearlyB)).toBe(0);

    await dailyTaskService.update(task.id, { parent_id: weeklyB });

    expect(await weeklyProgress(weeklyA)).toBe(0);
    expect(await monthlyProgress(monthlyA)).toBe(0);
    expect(await yearlyProgress(yearlyA)).toBe(0);
    expect(await weeklyProgress(weeklyB)).toBe(100);
    expect(await monthlyProgress(monthlyB)).toBe(100);
    expect(await yearlyProgress(yearlyB)).toBe(100);
  });

  it("criterion 18 (service): move to done propagates through all three levels", async () => {
    const yearly = await makeYearly("Y");
    const monthly = await makeMonthly("M", yearly);
    const weekly = await makeWeekly("W", monthly);
    const task = await dailyTaskService.create({ title: "t", ...PERIOD, parent_id: weekly });

    const moved = await moveDailyTask(task.id, { status: "done", order: 3 });

    expect(moved.status).toBe("done");
    expect(moved.order).toBe(3);
    expect(moved.completed_at).not.toBeNull();
    expect(await weeklyProgress(weekly)).toBe(100);
    expect(await monthlyProgress(monthly)).toBe(100);
    expect(await yearlyProgress(yearly)).toBe(100);
  });

  it("criterion 18 (route): PATCH /api/daily-tasks/[id]/move propagates and clears completed_at on leaving done", async () => {
    const yearly = await makeYearly("Y");
    const monthly = await makeMonthly("M", yearly);
    const weekly = await makeWeekly("W", monthly);
    const task = await dailyTaskService.create({ title: "t", ...PERIOD, parent_id: weekly });

    const url = `http://localhost/api/daily-tasks/${task.id}/move`;
    const call = async (body: unknown) => {
      const req = new Request(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      // handleRoute's context arg is the App Router `{ params }` promise.
      return movePATCH(req as never, { params: Promise.resolve({ id: task.id }) });
    };

    const doneRes = await call({ status: "done", order: 1 });
    expect(doneRes.status).toBe(200);
    expect(doneRes.headers.get("cache-control")).toBe("no-store");
    const donePayload = (await doneRes.json()) as { status: string; completed_at: string | null };
    expect(donePayload.status).toBe("done");
    expect(donePayload.completed_at).not.toBeNull();
    expect(await yearlyProgress(yearly)).toBe(100);

    const backRes = await call({ status: "todo", order: 0 });
    const backPayload = (await backRes.json()) as { completed_at: string | null };
    expect(backPayload.completed_at).toBeNull();
    expect(await weeklyProgress(weekly)).toBe(0);
    expect(await monthlyProgress(monthly)).toBe(0);
    expect(await yearlyProgress(yearly)).toBe(0);
  });

  it("criterion 18 (route): a malformed move body is rejected with 400 VALIDATION", async () => {
    const task = await makeTask("t", null);
    const req = new Request(`http://localhost/api/daily-tasks/${task}/move`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "nope", order: 1.5 }),
    });

    const res = await movePATCH(req as never, { params: Promise.resolve({ id: task }) });

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION");
  });

  it("criterion 19: unassigned tasks are excluded from every parent's progress", async () => {
    const weekly = await makeWeekly("W");
    await makeTask("assigned-done", weekly, "done");
    await makeTask("unassigned-todo", null, "todo");
    await makeTask("unassigned-todo-2", null, "todo");

    await recalculate("WeeklyPlan", weekly);

    // 1/1 assigned tasks done — the two unassigned todos do not drag it to 33.
    expect(await weeklyProgress(weekly)).toBe(100);
    expect(await DailyTask.countDocuments({ parent_id: null })).toBe(2);
  });

  it("criterion 20: after a WeeklyPlan delete its ex-children stay queryable and Monthly is recalculated", async () => {
    const monthly = await makeMonthly("M");
    const w1 = await makeWeekly("W1", monthly);
    const w2 = await makeWeekly("W2", monthly);
    const kept = await dailyTaskService.create({
      title: "kept",
      ...PERIOD,
      status: "done",
      parent_id: w1,
    });
    await dailyTaskService.create({ title: "other", ...PERIOD, status: "done", parent_id: w2 });
    expect(await monthlyProgress(monthly)).toBe(100);

    await weeklyPlanService.remove(w1);

    expect(await WeeklyPlan.findById(w1)).toBeNull();
    // Only W2 (100) is left under M.
    expect(await monthlyProgress(monthly)).toBe(100);
    // No orphan: the ex-child survives, is demoted to unassigned, and is
    // reachable through the unassigned filter rather than stranded on a dead id.
    expect(await DailyTask.countDocuments({})).toBe(2);
    const unassigned = await dailyTaskService.list({ unassigned: true });
    expect(unassigned.map((t) => t.id)).toEqual([kept.id]);
  });

  it("criterion 20 (demotion): once children are unassigned they are excluded and Monthly still reconciles", async () => {
    const monthly = await makeMonthly("M");
    const weekly = await makeWeekly("W", monthly);
    const task = await dailyTaskService.create({
      title: "t",
      ...PERIOD,
      status: "done",
      parent_id: weekly,
    });
    expect(await monthlyProgress(monthly)).toBe(100);

    // The demotion itself (parent_id → null) is the delete-service's job; this
    // asserts the progress half of criterion 20 once a child is unassigned.
    await dailyTaskService.update(task.id, { parent_id: null });

    expect(await weeklyProgress(weekly)).toBe(0);
    expect(await monthlyProgress(monthly)).toBe(0);
    expect(await DailyTask.countDocuments({ parent_id: null })).toBe(1);
  });

  it("MonthlyGoal reparent recalculates the old and new YearlyGoal", async () => {
    const yearlyA = await makeYearly("YA");
    const yearlyB = await makeYearly("YB");
    const monthly = await makeMonthly("M", yearlyA);
    const weekly = await makeWeekly("W", monthly);
    await dailyTaskService.create({ title: "t", ...PERIOD, status: "done", parent_id: weekly });
    expect(await yearlyProgress(yearlyA)).toBe(100);

    await monthlyGoalService.update(monthly, { parent_id: yearlyB });

    expect(await yearlyProgress(yearlyA)).toBe(0);
    expect(await yearlyProgress(yearlyB)).toBe(100);
  });
});
