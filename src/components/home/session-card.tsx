import { cn } from "@/lib/utils"

export const SESSION_CARD_CLASS =
  "rounded-[22px] bg-card p-3 not-dark:ring-1 not-dark:ring-inset not-dark:ring-border"

export function SessionDateBadge({
  timestamp,
  current = false,
}: {
  timestamp: number
  current?: boolean
}) {
  const date = new Date(timestamp)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-12 w-[46px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px]",
        "bg-surface-sunken"
      )}
    >
      <span
        className={cn(
          "text-[10px] leading-none font-medium tracking-wide uppercase",
          current ? "text-primary-emphasis" : "text-muted-foreground"
        )}
      >
        {date.toLocaleDateString([], { month: "short" })}
      </span>
      <span className="text-xl leading-none font-medium tabular-nums">
        {date.toLocaleDateString([], { day: "numeric" })}
      </span>
    </span>
  )
}
