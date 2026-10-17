import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  OVERLAY_KIND_ORDER,
  OVERLAY_KIND_STYLES,
  type OverlayPadKind,
} from "./overlay-kind-styles"

const DESCRIPTIONS: Record<OverlayPadKind, string> = {
  logo: "Your church logo or another image in a corner of the screen.",
  bar: "A full-width bar for scripture or a notice. Shows on its own.",
  lowerThird: "A name and title near the bottom, like the preacher's name.",
  ticker: "A message that scrolls along the bottom until you stop it.",
}

/** A tiny output frame showing where this kind of graphic sits. */
function KindIllustration({ kind }: { kind: OverlayPadKind }) {
  const color = OVERLAY_KIND_STYLES[kind].dot
  return (
    <span
      aria-hidden="true"
      className="relative block aspect-video w-full overflow-hidden rounded-md bg-gradient-to-br from-slate-700 to-slate-900"
    >
      {/* A faint stage so the graphic reads as sitting over video. */}
      <span className="absolute bottom-[38%] left-1/2 h-[34%] w-[14%] -translate-x-1/2 rounded-t-full bg-slate-950/60" />
      {kind === "logo" ? (
        <span
          className={cn(
            "absolute top-[10%] right-[6%] aspect-square w-[15%] rounded-full ring-2 ring-white/20",
            color
          )}
        />
      ) : null}
      {kind === "bar" ? (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 grid h-[34%] content-center gap-[6%] px-[6%]",
            color
          )}
        >
          <span className="h-[14%] min-h-0.5 w-[30%] rounded-full bg-white/80" />
          <span className="h-[12%] min-h-0.5 w-[85%] rounded-full bg-white/50" />
          <span className="h-[12%] min-h-0.5 w-[70%] rounded-full bg-white/50" />
        </span>
      ) : null}
      {kind === "lowerThird" ? (
        <span className="absolute bottom-[16%] left-[6%] grid h-[20%] w-[55%] content-center gap-[10%] rounded-sm bg-white px-[5%]">
          <span className={cn("absolute inset-y-0 left-0 w-[4%]", color)} />
          <span className="h-[22%] min-h-0.5 w-[70%] rounded-full bg-slate-800" />
          <span className="h-[16%] min-h-0.5 w-[45%] rounded-full bg-slate-400" />
        </span>
      ) : null}
      {kind === "ticker" ? (
        <span className="absolute inset-x-0 bottom-0 flex h-[14%] items-center bg-white">
          <span className={cn("h-full w-[18%]", color)} />
          <span className="ml-[4%] h-[28%] min-h-0.5 w-[60%] rounded-full bg-slate-500" />
        </span>
      ) : null}
    </span>
  )
}

/** Picks which kind of graphic to add, in the same colors as the pads. */
export function AddGraphicDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (kind: OverlayPadKind) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add graphic</DialogTitle>
          <DialogDescription>
            Choose what you want to show. It appears as a new pad.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {OVERLAY_KIND_ORDER.map((kind) => {
            const style = OVERLAY_KIND_STYLES[kind]
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onPick(kind)
                }}
                className={cn(
                  "grid content-start gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  style.tile
                )}
              >
                <KindIllustration kind={kind} />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    aria-hidden="true"
                    className={cn("size-2.5 rounded-full", style.dot)}
                  />
                  <span className={style.text}>{style.label}</span>
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {DESCRIPTIONS[kind]}
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
