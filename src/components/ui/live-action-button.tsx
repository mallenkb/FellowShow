import type { ComponentProps } from "react"
import { RadioIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LiveAction = "show" | "update" | "stop" | "stop-live"

const labels: Record<LiveAction, string> = {
  show: "Show on Live",
  update: "Update Live",
  stop: "Stop",
  "stop-live": "Stop Live",
}

/**
 * Several panels can send to Live at once, so each button names what it sends
 * through `label` (for example "Show graphics on Live").
 */
export function LiveActionButton({
  action,
  label,
  className,
  title,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  action: LiveAction
  label?: string
}) {
  const isStop = action === "stop" || action === "stop-live"
  const Icon = isStop ? SquareIcon : RadioIcon
  const text = label ?? labels[action]

  return (
    <Button
      type="button"
      variant={isStop ? "destructive" : "default"}
      size="sm"
      className={cn("min-w-0", className)}
      title={title ?? props["aria-label"] ?? text}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="min-w-0 truncate">{text}</span>
    </Button>
  )
}
