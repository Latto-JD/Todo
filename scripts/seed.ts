import { existsSync } from "node:fs";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import { DailyTask, WeeklyPlan, MonthlyGoal, YearlyGoal, type Status } from "../lib/models";
import { recalculate } from "../lib/services/progressService";

// tsx does not load .env.local automatically the way `next` does.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/**
 * Seed dates are relative to today so the dashboard's default current-week /
 * current-month / current-year pickers always land on seeded data. A fixed
 * calendar would silently show an empty dashboard once the date moved past it.
 */
const NOW = new Date();

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Monday of the ISO week containing `d`. */
const startOfIsoWeek = (d: Date) =>
  startOfDay(addDays(d, -((d.getDay() + 6) % 7)));

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const thisWeekStart = startOfIsoWeek(NOW);
const lastWeekStart = addDays(thisWeekStart, -7);
const thisMonth = startOfMonth(NOW);
const prevMonth = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
const prevMonthWeek1 = startOfIsoWeek(addDays(prevMonth, 7));
const prevMonthWeek2 = addDays(prevMonthWeek1, 7);

const weekRange = (mondayStart: Date) => ({
  period_start: mondayStart,
  period_end: endOfDay(addDays(mondayStart, 6)),
});

const monthLabel = (d: Date) => `${d.getMonth() + 1}월`;

type TaskSpec = { title: string; status: Status };

// 2 tasks-per-week matrix with a realistic todo/doing/done spread.
const WEEK_TASKS: TaskSpec[][] = [
  [
    { title: "리서치 정리 노트 작성", status: "done" },
    { title: "API 스펙 초안 잡기", status: "doing" },
    { title: "경쟁 제품 3개 비교", status: "todo" },
  ],
  [
    { title: "데이터 모델 확정", status: "done" },
    { title: "시드 스크립트 작성", status: "done" },
    { title: "인덱스 검증 스크립트", status: "todo" },
  ],
  [
    { title: "CRUD 라우트 뼈대", status: "todo" },
    { title: "검증 계층 연결", status: "doing" },
    { title: "통합 테스트 작성", status: "done" },
  ],
  [
    { title: "칸반 보드 레이아웃", status: "todo" },
    { title: "드래그 앤 드롭 훅", status: "todo" },
    { title: "진행률 바 컴포넌트", status: "todo" },
  ],
];

async function main() {
  await connectToDatabase();

  await Promise.all([
    DailyTask.deleteMany({}),
    WeeklyPlan.deleteMany({}),
    MonthlyGoal.deleteMany({}),
    YearlyGoal.deleteMany({}),
  ]);

  const [year] = await YearlyGoal.create([
    {
      title: `${NOW.getFullYear()}년 목표: 목표관리 앱 출시`,
      description: "1년 동안 4계층 목표관리 제품을 설계·구현·출시한다.",
      period_start: startOfDay(new Date(NOW.getFullYear(), 0, 1)),
      period_end: endOfDay(new Date(NOW.getFullYear(), 11, 31)),
      progress: 0,
    },
  ]);

  const months = await MonthlyGoal.create([
    {
      title: `${monthLabel(prevMonth)}: 기반 다지기`,
      description: "요구사항 분석과 데이터 계층 구축.",
      period_start: startOfMonth(prevMonth),
      period_end: endOfMonth(prevMonth),
      progress: 0,
      parent_id: year._id,
    },
    {
      title: `${monthLabel(thisMonth)}: 기능 구현`,
      description: "API·프론트엔드·칸반 보드 구현.",
      period_start: startOfMonth(thisMonth),
      period_end: endOfMonth(thisMonth),
      progress: 0,
      parent_id: year._id,
    },
  ]);

  // 2 ISO weeks per month; the last one is the CURRENT week so the dashboard
  // and board open on live data.
  const weeks = await WeeklyPlan.create([
    {
      title: `${monthLabel(prevMonth)} 2주차`,
      ...weekRange(prevMonthWeek1),
      progress: 0,
      parent_id: months[0]._id,
    },
    {
      title: `${monthLabel(prevMonth)} 3주차`,
      ...weekRange(prevMonthWeek2),
      progress: 0,
      parent_id: months[0]._id,
    },
    {
      title: "지난주",
      ...weekRange(lastWeekStart),
      progress: 0,
      parent_id: months[1]._id,
    },
    {
      title: "이번주",
      ...weekRange(thisWeekStart),
      progress: 0,
      parent_id: months[1]._id,
    },
  ]);

  const taskDocs = weeks.flatMap((week, weekIdx) =>
    WEEK_TASKS[weekIdx].map((spec, order) => ({
      title: spec.title,
      description: "",
      period_start: week.period_start,
      period_end: week.period_end,
      due_date: week.period_end,
      status: spec.status,
      completed_at: spec.status === "done" ? addDays(week.period_start as Date, order + 1) : null,
      order,
      parent_id: week._id,
    })),
  );

  await DailyTask.create(taskDocs);

  // Seeded rows are written with progress 0; run the real cascade once per week
  // so the seeded tree is internally consistent (weekly → monthly → yearly)
  // instead of showing 0% next to completed tasks.
  for (const week of weeks) {
    await recalculate("WeeklyPlan", String(week._id));
  }

  const byStatus = taskDocs.reduce<Record<Status, number>>(
    (acc, t) => {
      acc[t.status] += 1;
      return acc;
    },
    { todo: 0, doing: 0, done: 0 },
  );

  const summary = [
    { collection: "yearlygoals", inserted: await YearlyGoal.countDocuments() },
    { collection: "monthlygoals", inserted: await MonthlyGoal.countDocuments() },
    { collection: "weeklyplans", inserted: await WeeklyPlan.countDocuments() },
    { collection: "dailytasks", inserted: await DailyTask.countDocuments() },
  ];

  const progressRows = await Promise.all([
    YearlyGoal.findById(year._id),
    ...weeks.map((w) => WeeklyPlan.findById(w._id)),
  ]);

  console.log("\nSeed complete.");
  console.table(summary);
  console.log("DailyTask status spread:", byStatus);
  console.table(
    progressRows.filter(Boolean).map((d) => ({
      title: d!.get("title"),
      progress: d!.get("progress"),
    })),
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors during failure cleanup
  }
  process.exit(1);
});
