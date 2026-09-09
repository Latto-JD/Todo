import {
  test,
  expect,
  request,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";

/**
 * PRD User Flow 1-9 end-to-end smoke (US-008, PLAN.md §5 criterion 23).
 *
 * Needs a live server + real Atlas (playwright.config `webServer` runs
 * `npm run dev`). The spec builds its own goal tree and tears it down in
 * `afterAll`, so it never depends on seed data. Everything is dated in the
 * CURRENT period (today = 2026-09-09) so the dashboard's default
 * current-week / -month / -year pickers actually surface the fixture.
 *
 * Steps 1-3 (create + link the 1년/월간/주간 hierarchy) go through the
 * `/hierarchy` UI including the parent-link selects. DailyTasks are created via
 * the API — the app has no task-create screen — but every other assertion
 * (board drag, progress cascade, dashboard cards, edit, delete) is made through
 * the UI.
 */

const BASE_URL = "http://localhost:3000";
const TAG = `UF${Date.now().toString().slice(-8)}`;

const YEARLY_TITLE = `${TAG} 연간 목표`;
const MONTHLY_TITLE = `${TAG} 월간 목표`;
const WEEKLY_TITLE = `${TAG} 주간 계획`;
const taskTitle = (i: number) => `${TAG} 할 일 ${i}`;

// Current-period ranges for today = 2026-09-09 (ISO week Mon 09-07 .. Sun 09-13).
const YEAR_RANGE = { start: "2026-01-01", end: "2026-12-31" };
const MONTH_RANGE = { start: "2026-09-01", end: "2026-09-30" };
const WEEK_RANGE = { start: "2026-09-07", end: "2026-09-13" };

let api: APIRequestContext;
let yearlyId = "";
let monthlyId = "";
let weeklyId = "";
let taskIds: string[] = [];

test.beforeAll(async () => {
  api = await request.newContext({ baseURL: BASE_URL });
});

test.afterAll(async () => {
  const del = async (path: string) => {
    try {
      await api.delete(path);
    } catch {
      /* best effort */
    }
  };

  for (const id of taskIds) await del(`/api/daily-tasks/${id}`);

  // Sweep leftovers by tag in case the test failed part-way through.
  const sweeps: [string, string][] = [
    ["/api/daily-tasks", "unassigned=true"],
    ["/api/weekly-plans", `from=${WEEK_RANGE.start}&to=${WEEK_RANGE.end}`],
    ["/api/monthly-goals", `from=${MONTH_RANGE.start}&to=${MONTH_RANGE.end}`],
    ["/api/yearly-goals", `from=${YEAR_RANGE.start}&to=${YEAR_RANGE.end}`],
  ];
  for (const [path, query] of sweeps) {
    try {
      const res = await api.get(`${path}?${query}`);
      if (!res.ok()) continue;
      const rows = (await res.json()) as { id: string; title: string }[];
      for (const row of rows) {
        if (row.title.startsWith(TAG)) await del(`${path}/${row.id}`);
      }
    } catch {
      /* best effort */
    }
  }

  await api.dispose();
});

async function findIdByTitle(
  path: string,
  title: string,
  query: string,
): Promise<string> {
  const res = await api.get(`${path}?${query}`);
  expect(res.ok(), `GET ${path}?${query}`).toBeTruthy();
  const rows = (await res.json()) as { id: string; title: string }[];
  const match = rows.find((r) => r.title === title);
  expect(match, `"${title}" not found in ${path}`).toBeTruthy();
  return match!.id;
}

async function parentOf(path: string, id: string): Promise<string | null> {
  const res = await api.get(`${path}/${id}`);
  expect(res.ok(), `GET ${path}/${id}`).toBeTruthy();
  return ((await res.json()) as { parent_id: string | null }).parent_id;
}

/** Fill and submit the currently-open `EntityForm` modal. */
async function submitEntityForm(
  page: Page,
  opts: { title: string; start: string; end: string },
): Promise<void> {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("제목").fill(opts.title);
  await dialog.getByLabel("시작일").fill(opts.start);
  await dialog.getByLabel("종료일").fill(opts.end);
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(dialog).toBeHidden();
}

function columnSection(page: Page, heading: string): Locator {
  return page.locator("section", {
    has: page.getByRole("heading", { name: heading, exact: true }),
  });
}

async function boardProgress(page: Page): Promise<number> {
  const raw = await page
    .getByRole("progressbar")
    .first()
    .getAttribute("aria-valuenow");
  return Number(raw ?? "-1");
}

async function cardProgress(card: Locator): Promise<number> {
  const raw = await card
    .getByRole("progressbar")
    .first()
    .getAttribute("aria-valuenow");
  return Number(raw ?? "-1");
}

/** Drag a task card's handle onto a column (drives the dnd-kit PointerSensor). */
async function dragCardToColumn(
  page: Page,
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

test("PRD User Flow 1-9: hierarchy → board drag → dashboard cascade → edit → delete", async ({
  page,
}) => {
  test.setTimeout(180_000);

  // ---- Flow 1: create a YearlyGoal via the /hierarchy UI ----
  await page.goto("/hierarchy");
  const yearlyCol = columnSection(page, "1년 목표");
  await yearlyCol.getByRole("button", { name: "＋ 추가" }).click();
  await submitEntityForm(page, { title: YEARLY_TITLE, ...YEAR_RANGE });
  await expect(yearlyCol.getByRole("button", { name: YEARLY_TITLE })).toBeVisible();
  yearlyId = await findIdByTitle(
    "/api/yearly-goals",
    YEARLY_TITLE,
    `from=${YEAR_RANGE.start}&to=${YEAR_RANGE.end}`,
  );

  // ---- Flow 2: create a MonthlyGoal linked to that year ----
  // Selecting the year row enables the 월간 목표 column and pre-fills the parent.
  await yearlyCol.getByRole("button", { name: YEARLY_TITLE }).click();
  const monthlyCol = columnSection(page, "월간 목표");
  await monthlyCol.getByRole("button", { name: "＋ 추가" }).click();
  await submitEntityForm(page, { title: MONTHLY_TITLE, ...MONTH_RANGE });
  await expect(
    monthlyCol.getByRole("button", { name: MONTHLY_TITLE }),
  ).toBeVisible();
  monthlyId = await findIdByTitle(
    "/api/monthly-goals",
    MONTHLY_TITLE,
    `from=${MONTH_RANGE.start}&to=${MONTH_RANGE.end}`,
  );
  expect(await parentOf("/api/monthly-goals", monthlyId)).toBe(yearlyId);

  // ---- Flow 3: create a WeeklyPlan linked to that month ----
  await monthlyCol.getByRole("button", { name: MONTHLY_TITLE }).click();
  const weeklyCol = columnSection(page, "주간 계획");
  await weeklyCol.getByRole("button", { name: "＋ 추가" }).click();
  await submitEntityForm(page, { title: WEEKLY_TITLE, ...WEEK_RANGE });
  await expect(
    weeklyCol.getByRole("button", { name: WEEKLY_TITLE }),
  ).toBeVisible();
  weeklyId = await findIdByTitle(
    "/api/weekly-plans",
    WEEKLY_TITLE,
    `from=${WEEK_RANGE.start}&to=${WEEK_RANGE.end}`,
  );
  expect(await parentOf("/api/weekly-plans", weeklyId)).toBe(monthlyId);

  // ---- Flow 4: create 3 DailyTasks linked to the week (no task-create UI) ----
  taskIds = [];
  for (let i = 0; i < 3; i++) {
    const res = await api.post("/api/daily-tasks", {
      data: {
        title: taskTitle(i),
        period_start: "2026-09-09",
        period_end: "2026-09-09",
        parent_id: weeklyId,
        status: "todo",
        order: i,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    taskIds.push(((await res.json()) as { id: string }).id);
  }

  // ---- Flow 5 + 6: board — drag 할 일 -> 진행 중, then 할 일 -> 완료 ----
  await page.goto(`/board?parent_id=${weeklyId}`);
  const todoCol = page.getByTestId("column-todo");
  const doingCol = page.getByTestId("column-doing");
  const doneCol = page.getByTestId("column-done");

  await expect(todoCol).toContainText(taskTitle(0));
  await expect(todoCol).toContainText(taskTitle(1));
  await expect(todoCol).toContainText(taskTitle(2));
  expect(await boardProgress(page)).toBe(0);

  // ---- Flow 5: same-column reorder persists across reload (criterion 11) ----
  const todoCards = () => todoCol.locator('[data-testid^="task-"]');
  await expect(todoCards().first()).toHaveAttribute(
    "data-testid",
    `task-${taskIds[0]}`,
  );
  await dragCardToColumn(page, `drag-${taskIds[2]}`, `task-${taskIds[0]}`);
  await expect(todoCards().first()).toHaveAttribute(
    "data-testid",
    `task-${taskIds[2]}`,
  );
  await page.reload();
  await expect(todoCards().first()).toHaveAttribute(
    "data-testid",
    `task-${taskIds[2]}`,
  );

  await dragCardToColumn(page, `drag-${taskIds[0]}`, "column-doing");
  await expect(doingCol).toContainText(taskTitle(0));
  await expect(todoCol).not.toContainText(taskTitle(0));

  await dragCardToColumn(page, `drag-${taskIds[1]}`, "column-done");
  await expect(doneCol).toContainText(taskTitle(1));
  await expect(todoCol).not.toContainText(taskTitle(1));

  // ---- Flow 7 (board side): weekly ProgressBar reflects 1 done of 3 -> 33 ----
  await expect
    .poll(() => boardProgress(page), { timeout: 15_000 })
    .toBe(33);

  // ---- Flow 8: dashboard shows the weekly -> monthly -> yearly cascade ----
  await page.goto("/dashboard");
  const weekCard = columnSection(page, "주간");
  const monthCard = columnSection(page, "월간");
  const yearCard = columnSection(page, "연간");

  await weekCard.getByRole("combobox").selectOption({ label: WEEKLY_TITLE });
  await monthCard.getByRole("combobox").selectOption({ label: MONTHLY_TITLE });
  await yearCard.getByRole("combobox").selectOption({ label: YEARLY_TITLE });

  // weekly = round(1/3*100) = 33; monthly = round(mean[33]) = 33; yearly = 33.
  await expect.poll(() => cardProgress(weekCard), { timeout: 15_000 }).toBe(33);
  await expect.poll(() => cardProgress(monthCard), { timeout: 15_000 }).toBe(33);
  await expect.poll(() => cardProgress(yearCard), { timeout: 15_000 }).toBe(33);

  // ---- Flow 9a: edit a task through the form (title) ----
  await page.goto(`/board?parent_id=${weeklyId}`);
  const editedTitle = `${taskTitle(2)} (수정됨)`;
  await page.getByTestId(`edit-${taskIds[2]}`).click();
  const editDialog = page.getByRole("dialog", { name: "할 일 수정" });
  await editDialog.getByLabel("제목").fill(editedTitle);
  await editDialog.getByRole("button", { name: "저장" }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByTestId(`task-${taskIds[2]}`)).toContainText(editedTitle);

  // ---- Flow 9b: delete a task through ConfirmDeleteModal ----
  await page.getByTestId(`delete-${taskIds[2]}`).click();
  const confirmDialog = page.getByRole("dialog", { name: "삭제 확인" });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByTestId(`task-${taskIds[2]}`)).toHaveCount(0);
  taskIds = taskIds.slice(0, 2);

  // weekly progress recalculated: 1 done of 2 remaining -> 50.
  await expect
    .poll(() => boardProgress(page), { timeout: 15_000 })
    .toBe(50);
});
