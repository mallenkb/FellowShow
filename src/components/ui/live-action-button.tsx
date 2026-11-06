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

export function LiveActionButton({
  action,
  className,
  title,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { action: LiveAction }) {
  const isStop = action === "stop" || action === "stop-live"
  const Icon = isStop ? SquareIcon : RadioIcon

  return (
    <Button
      type="button"
      variant={isStop ? "destructive" : "default"}
      size="sm"
      className={cn("min-w-0", className)}
      title={title ?? props["aria-label"] ?? labels[action]}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="min-w-0 truncate">{labels[action]}</span>
    </Button>
  )
}
