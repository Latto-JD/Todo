import Link from "next/link";

const links = [
  {
    href: "/hierarchy",
    title: "목표 계층",
    desc: "1년 · 월간 · 주간 · 할 일을 부모-자식으로 연결해 관리합니다.",
  },
  {
    href: "/board",
    title: "칸반 보드",
    desc: "할 일을 Todo · Doing · Done 컬럼으로 드래그해 상태를 바꿉니다.",
  },
  {
    href: "/dashboard",
    title: "대시보드",
    desc: "주간 · 월간 · 연간 진행률을 한눈에 확인합니다.",
  },
];

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-2xl font-bold">할 일 관리</h1>
          <p className="mt-2 text-sm text-zinc-600">
            일일 할 일부터 1년 목표까지 하나의 구조로 연결하고, 하위 실행이 상위
            목표 진행률에 자동으로 반영되는 목표 관리 앱입니다.
          </p>
        </div>
        <ul className="grid gap-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="font-semibold">{link.title}</span>
                <span className="mt-1 block text-sm text-zinc-600">
                  {link.desc}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
