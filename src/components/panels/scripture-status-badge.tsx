import { LIVE_STATUS_BADGE_CLASS } from "@/components/ui/live-status-styles"
import { cn } from "@/lib/utils"

export function ScriptureStatusBadge({
  status,
}: {
  status: "live" | "in preview" | null
}) {
  const badgePosition = "col-start-1 row-start-1 px-2 py-0.5 whitespace-nowrap"
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 text-[0.625rem] font-medium uppercase"
    >
      <span className={cn(badgePosition, "invisible")}>In preview</span>
      {status ? (
        <span
          className={cn(
            badgePosition,
            "justify-self-start rounded-full",
            status === "live"
              ? LIVE_STATUS_BADGE_CLASS
              : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
          )}
        >
          {status === "live" ? "Live" : "In preview"}
        </span>
      ) : null}
    </span>
  )
}
