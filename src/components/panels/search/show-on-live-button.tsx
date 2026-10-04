import { RadioIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBroadcastStore } from "@/stores"

export function ShowOnLiveButton({
  label,
  disabled,
  onShow,
}: {
  label: string
  disabled: boolean
  onShow: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label={`Show ${label} on Live`}
      title={disabled ? "Add text to show this on Live" : "Show on Live now"}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onShow()
      }}
    >
      <RadioIcon className="size-3.5" />
    </Button>
  )
}

/** Uses the same explicit stop action as Preview while the row is live. */
export function LiveStopTag({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="destructive"
      size="xs"
      aria-label={`Stop Live for ${label}`}
      title="Stop Live"
      onClick={(event) => {
        event.stopPropagation()
        useBroadcastStore.getState().setLive(false)
      }}
      className="mr-1 shrink-0"
    >
      <SquareIcon className="size-3 shrink-0" />
      Stop Live
    </Button>
  )
}

export function NextTag() {
  return (
    <span className="shrink-0 rounded border border-blue-500/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-blue-400">
      NEXT
    </span>
  )
}
