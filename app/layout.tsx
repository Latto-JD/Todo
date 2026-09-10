import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { Toaster } from "@/components/Toast";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "할 일 관리 앱",
  description: "일일 할 일 → 주간 → 월간 → 1년 목표를 연결하고 진행률을 자동 반영하는 목표 관리 앱",
};

/**
 * Runs before the first paint, so a dark-theme user never sees a white flash.
 * It has to be inline and synchronous for that: the server cannot know the
 * stored preference, so the class is applied here rather than rendered.
 * `<html>` therefore carries `suppressHydrationWarning` — this attribute is
 * expected to differ between the server HTML and the hydrated client.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/*
          First child of <body>, not <head>: Next 16 drops an inline script
          rendered into <head> from the root layout, and this one has to survive
          to the client to beat the first paint.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
