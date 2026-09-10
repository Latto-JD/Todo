import Link from "next/link";
import { AddTaskButton } from "@/components/AddTaskButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconCalendarWeek,
  IconCheckSquare,
  IconTarget,
  type IconProps,
} from "@/components/icons";

const links: {
  href: string;
  title: string;
  desc: string;
  Icon: (props: IconProps) => React.ReactElement;
}[] = [
  {
    href: "/hierarchy",
    title: "목표 계층",
    desc: "1년 · 월간 · 주간 · 할 일을 부모-자식으로 연결해 관리합니다.",
    Icon: IconTarget,
  },
  {
    href: "/board",
    title: "칸반 보드",
    desc: "할 일을 Todo · Doing · Done 컬럼으로 드래그해 상태를 바꿉니다.",
    Icon: IconCheckSquare,
  },
  {
    href: "/dashboard",
    title: "대시보드",
    desc: "주간 · 월간 · 연간 진행률을 한눈에 확인합니다.",
    Icon: IconCalendarWeek,
  },
];

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">할 일 관리</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              일일 할 일부터 1년 목표까지 하나의 구조로 연결하고, 하위 실행이
              상위 목표 진행률에 자동으로 반영되는 목표 관리 앱입니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AddTaskButton />
            <ThemeToggle />
          </div>
        </div>
        <ul className="grid gap-3">
          {links.map(({ href, title, desc, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="min-w-0">
                  <span className="font-semibold">{title}</span>
                  <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                    {desc}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
