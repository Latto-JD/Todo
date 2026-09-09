import { test, expect, request, type APIRequestContext } from "@playwright/test";

/**
 * Board smoke test (US-006, acceptance criteria 9-11).
 *
 * Needs a live server + real Atlas (playwright.config `webServer` runs
 * `npm run dev`). The spec builds its own YearlyGoal -> Monthly -> Weekly -> 3
 * DailyTasks fixture through the API so it never depends on seed data, then
 * tears it down in `afterAll`.
 */

const BASE_URL = "http://localhost:3000";

let api: APIRequestContext;
let yearlyId: string;
let monthlyId: string;
let weeklyId: string;
let taskIds: string[] = [];

async function createEntity(
  path: string,
  data: Record<string, unknown>,
): Promise<string> {
  const res = await api.post(path, { data });
  expect(res.status(), `${path} -> ${await res.text()}`).toBe(201);
  const body = (await res.json()) as { id: string };
  expect(body.id).toBeTruthy();
  return body.id;
}

test.beforeAll(async () => {
  api = await request.newContext({ baseURL: BASE_URL });

  yearlyId = await createEntity("/api/yearly-goals", {
    title: "E2E 보드 연간 목표",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
  });
  monthlyId = await createEntity("/api/monthly-goals", {
    title: "E2E 보드 월간 목표",
    period_start: "2026-09-01",
    period_end: "2026-09-30",
    parent_id: yearlyId,
  });
  weeklyId = await createEntity("/api/weekly-plans", {
    title: "E2E 보드 주간 계획",
    period_start: "2026-09-07",
    period_end: "2026-09-13",
    parent_id: monthlyId,
  });

  taskIds = [];
  for (let i = 0; i < 3; i++) {
    taskIds.push(
      await createEntity("/api/daily-tasks", {
        title: `E2E 카드 ${i}`,
        period_start: "2026-09-07",
        period_end: "2026-09-13",
        parent_id: weeklyId,
        status: "todo",
        order: i,
      }),
    );
  }
});

test.afterAll(async () => {
  for (const id of taskIds) {
    await api.delete(`/api/daily-tasks/${id}`);
  }
  await api.delete(`/api/weekly-plans/${weeklyId}`);
  await api.delete(`/api/monthly-goals/${monthlyId}`);
  await api.delete(`/api/yearly-goals/${yearlyId}`);
  await api.dispose();
});

async function progressValue(page: import("@playwright/test").Page): Promise<number> {
  const raw = await page
    .getByRole("progressbar")
    .first()
    .getAttribute("aria-valuenow");
  return Number(raw ?? "0");
}

async function dragCardToColumn(
  page: import("@playwright/test").Page,
  handleTestId: string,
  columnTestId: string,
): Promise<void> {
  const handle = page.getByTestId(handleTestId);
  const column = page.getByTestId(columnTestId);
  const hb = await handle.boundingBox();
  const cb = await column.boundingBox();
  if (!hb || !cb) throw new Error("drag source/target not visible");

  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  // Exceed the 6px PointerSensor activation constraint, then travel to target.
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 24, { steps: 8 });
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 25 });
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2 + 6, { steps: 8 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

test("GET /api/board groups tasks by column, each ordered by `order`", async () => {
  const res = await api.get(`/api/board?parent_id=${weeklyId}`);
  expect(res.ok()).toBeTruthy();
  const board = (await res.json()) as {
    todo: { id: string; order: number }[];
    doing: unknown[];
    done: unknown[];
  };
  expect(board.todo.map((t) => t.id)).toEqual(taskIds);
  expect(board.doing).toEqual([]);
  expect(board.done).toEqual([]);
  const orders = board.todo.map((t) => t.order);
  expect([...orders]).toEqual([...orders].sort((a, b) => a - b));
});

test("drag a card to 완료: moves, bumps progress, survives reload", async ({
  page,
}) => {
  await page.goto(`/board?parent_id=${weeklyId}`);

  const todoColumn = page.getByTestId("column-todo");
  const doneColumn = page.getByTestId("column-done");
  await expect(todoColumn).toContainText("E2E 카드 0");

  const before = await progressValue(page);
  expect(before).toBe(0);

  await dragCardToColumn(page, `drag-${taskIds[0]}`, "column-done");

  // (a) card is now in the 완료 column
  await expect(doneColumn).toContainText("E2E 카드 0");
  await expect(todoColumn).not.toContainText("E2E 카드 0");

  // (b) weekly ProgressBar increased (1 of 3 done -> 33)
  await expect
    .poll(() => progressValue(page), { timeout: 10_000 })
    .toBeGreaterThan(before);

  // (c) reload -> still in 완료
  await page.reload();
  await expect(page.getByTestId("column-done")).toContainText("E2E 카드 0");
  await expect(page.getByTestId("column-todo")).not.toContainText("E2E 카드 0");
});
