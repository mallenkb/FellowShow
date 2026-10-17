export type OverlayPadKind = "logo" | "lowerThird" | "ticker" | "bar"

/**
 * One color per graphic type, used on pads, Looks and the Live strip so an
 * operator can tell a lower third from a bar at a glance.
 */
export const OVERLAY_KIND_STYLES: Record<
  OverlayPadKind,
  {
    label: string
    tile: string
    text: string
    dot: string
    hover: string
    active: string
    hoverText: string
  }
> = {
  logo: {
    label: "Logo",
    tile: "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    hover: "hover:border-emerald-500/70 hover:bg-emerald-500/10",
    active: "border-emerald-500 bg-emerald-500/10 ring-emerald-500/30",
    hoverText: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
  },
  lowerThird: {
    label: "Lower third",
    tile: "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    hover: "hover:border-amber-500/70 hover:bg-amber-500/10",
    active: "border-amber-500 bg-amber-500/10 ring-amber-500/30",
    hoverText: "group-hover:text-amber-700 dark:group-hover:text-amber-300",
  },
  ticker: {
    label: "Scrolling text",
    tile: "border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    hover: "hover:border-sky-500/70 hover:bg-sky-500/10",
    active: "border-sky-500 bg-sky-500/10 ring-sky-500/30",
    hoverText: "group-hover:text-sky-700 dark:group-hover:text-sky-300",
  },
  bar: {
    label: "Bar",
    tile: "border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    hover: "hover:border-violet-500/70 hover:bg-violet-500/10",
    active: "border-violet-500 bg-violet-500/10 ring-violet-500/30",
    hoverText: "group-hover:text-violet-700 dark:group-hover:text-violet-300",
  },
}

export const OVERLAY_KIND_ORDER: readonly OverlayPadKind[] = [
  "logo",
  "bar",
  "lowerThird",
  "ticker",
]
