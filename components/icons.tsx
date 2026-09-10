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
