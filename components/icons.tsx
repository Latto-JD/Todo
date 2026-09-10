import type { SVGProps } from "react";
import type { Status } from "@/lib/validation";
import type { EntityType } from "@/lib/queries/types";

/**
 * Inline SVG icon set — no icon dependency, no network request, and every glyph
 * inherits `currentColor` + `1em` sizing so it takes the colour and scale of the
 * text it sits next to.
 *
 * Every icon is `aria-hidden`: icons here are always paired with visible text or
 * an `aria-label` on the control, so exposing them to the accessibility tree
 * would only duplicate that name.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function Icon({ className, ...props }: IconProps & { children?: React.ReactNode }) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Hierarchy levels — each level gets a glyph that widens with its span
 * ------------------------------------------------------------------ */

/** 1년 목표 — a target: the single far-off thing everything else aims at. */
export function IconTarget(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** 월간 목표 — a full calendar page. */
export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Icon>
  );
}

/** 주간 계획 — a calendar with one week band picked out. */
export function IconCalendarWeek(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M6.5 15h11" strokeWidth={2.75} />
    </Icon>
  );
}

/** 할 일 — a checkbox: the only level you actually tick off. */
export function IconCheckSquare(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="m8 12 2.6 2.6L16 9.2" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ *
 * Task status — an empty / half-filled / ticked circle reads as a
 * progression at a glance, even before the colour registers.
 * ------------------------------------------------------------------ */

export function IconCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
    </Icon>
  );
}

export function IconHalfCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.2 2.6 2.6 5-5.4" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ *
 * Card details
 * ------------------------------------------------------------------ */

/** Due date that is still ahead. */
export function IconClock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3 1.8" />
    </Icon>
  );
}

/** Due date already past — pairs with a red tint on the card. */
export function IconAlert(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 2.8 19.8h18.4L12 3.5Z" />
      <path d="M12 9.8v4" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Drag handle. */
export function IconGrip(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={0}>
      {[6, 12, 18].map((cy) => (
        <g key={cy}>
          <circle cx="9.5" cy={cy} r="1.35" fill="currentColor" />
          <circle cx="14.5" cy={cy} r="1.35" fill="currentColor" />
        </g>
      ))}
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.25}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Icon>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Icon>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.7 8.7 0 1 0 11.3 11.3Z" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export type IconComponent = (props: IconProps) => React.ReactElement;

export const ENTITY_ICON: Record<EntityType, IconComponent> = {
  "yearly-goals": IconTarget,
  "monthly-goals": IconCalendar,
  "weekly-plans": IconCalendarWeek,
  "daily-tasks": IconCheckSquare,
};

export const STATUS_ICON: Record<Status, IconComponent> = {
  todo: IconCircle,
  doing: IconHalfCircle,
  done: IconCheckCircle,
};

/** Status accent, shared by the board cards and the dashboard status pills. */
export const STATUS_TONE: Record<Status, string> = {
  todo: "text-zinc-400 dark:text-zinc-500",
  doing: "text-amber-500 dark:text-amber-400",
  done: "text-emerald-600 dark:text-emerald-400",
};

/* ------------------------------------------------------------------ *
 * Hierarchy level surfaces (dark mode only)
 *
 * On a near-black page every neutral card lands on the same value, so the
 * three goal levels were impossible to tell apart. They now sit on a warm
 * ramp — gold at the top level, shading to orange as the span narrows — with
 * the outer edge carrying the brighter gold so the card reads as a card.
 * Depth is encoded twice over (warmth AND border brightness), so the ordering
 * survives for anyone who cannot separate the two hues.
 *
 * Light mode is untouched: it already had enough contrast to work.
 * DailyTask stays neutral throughout — on the board a card's colour belongs to
 * its status, and keeping tasks cool is what sets them apart from goals.
 * ------------------------------------------------------------------ */

/** Outer card for a level — the hierarchy columns and the dashboard cards. */
export const LEVEL_CARD: Record<EntityType, string> = {
  "yearly-goals": "dark:border-[#e0b34d] dark:bg-[#2c2211]",
  "monthly-goals": "dark:border-[#cb8f42] dark:bg-[#2a1c10]",
  "weekly-plans": "dark:border-[#bd8340] dark:bg-[#26170e]",
  "daily-tasks": "dark:border-zinc-800 dark:bg-zinc-900/60",
};

/** A row inside one of those cards — one step lighter, so it lifts off. */
export const LEVEL_ROW: Record<EntityType, string> = {
  "yearly-goals": "dark:border-[#9c7a30] dark:bg-[#3b2d16]",
  "monthly-goals": "dark:border-[#8d6130] dark:bg-[#382511]",
  "weekly-plans": "dark:border-[#734c24] dark:bg-[#322010]",
  "daily-tasks": "dark:border-zinc-700 dark:bg-zinc-800",
};

/** Selected row: the same ramp pushed brighter rather than swapped for a
 *  different hue, so selection reads as emphasis instead of a second system.
 *  The ring is what carries it — two warm surfaces one step apart are too
 *  close to separate on background alone. */
export const LEVEL_ROW_SELECTED: Record<EntityType, string> = {
  "yearly-goals":
    "dark:border-[#f5cd72] dark:bg-[#54401d] dark:ring-1 dark:ring-[#f5cd72]",
  "monthly-goals":
    "dark:border-[#eda757] dark:bg-[#4e3418] dark:ring-1 dark:ring-[#eda757]",
  "weekly-plans":
    "dark:border-[#e09a4f] dark:bg-[#452c15] dark:ring-1 dark:ring-[#e09a4f]",
  "daily-tasks": "dark:border-emerald-600 dark:bg-emerald-950/50",
};

/** Heading glyph, tinted to its level so the ramp is legible even collapsed. */
export const LEVEL_ICON: Record<EntityType, string> = {
  "yearly-goals": "dark:text-[#f5cd72]",
  "monthly-goals": "dark:text-[#eda757]",
  "weekly-plans": "dark:text-[#d38a45]",
  "daily-tasks": "dark:text-emerald-400",
};

/** The card's own "＋ 추가" control, kept inside its level's hue. */
export const LEVEL_BUTTON: Record<EntityType, string> = {
  "yearly-goals":
    "dark:border-[#9c7a30] dark:text-[#f5cd72] dark:hover:bg-[#54401d]",
  "monthly-goals":
    "dark:border-[#8d6130] dark:text-[#eda757] dark:hover:bg-[#4e3418]",
  "weekly-plans":
    "dark:border-[#734c24] dark:text-[#d38a45] dark:hover:bg-[#452c15]",
  "daily-tasks":
    "dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950",
};

/** Muted body text that stays legible on the warm surfaces above. */
export const LEVEL_MUTED = "dark:text-amber-100/60";
