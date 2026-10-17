import { BookmarkPlusIcon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  overlaySelectionFromLook,
  overlaySelectionsMatch,
  resolveOverlaySelection,
} from "@/lib/overlays"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import type { OverlayConfiguration, OverlayLook } from "@/types"
import { OVERLAY_KIND_STYLES } from "./overlay-kind-styles"

function lookSummary(config: OverlayConfiguration, look: OverlayLook): string {
  const parts = [
    look.logo ? "Logo" : null,
    config.bars.find((bar) => bar.id === look.barId)?.name,
    config.lowerThirdPresets.find((item) => item.id === look.lowerThirdPresetId)
      ?.name,
    config.tickerMessages.find((item) => item.id === look.tickerMessageId)
      ? "Scrolling text"
      : null,
  ].filter(Boolean)
  return parts.join(" · ") || "No graphics"
}

/** A tiny output frame showing where a Look's graphics sit, in type colors. */
function LookThumbnail({ look }: { look: OverlayLook }) {
  return (
    <span
      aria-hidden="true"
      className="relative block aspect-video w-[4.5rem] shrink-0 overflow-hidden rounded bg-slate-800"
    >
      {look.logo ? (
        <span
          className={cn(
            "absolute top-[9%] right-[6%] aspect-square w-[14%] rounded-full",
            OVERLAY_KIND_STYLES.logo.dot
          )}
        />
      ) : null}
      {look.lowerThirdPresetId ? (
        <span
          className={cn(
            "absolute bottom-[24%] left-[6%] h-[14%] w-[52%] rounded-[1px]",
            OVERLAY_KIND_STYLES.lowerThird.dot
          )}
        />
      ) : null}
      {look.barId ? (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 h-[30%]",
            OVERLAY_KIND_STYLES.bar.dot
          )}
        />
      ) : null}
      {look.tickerMessageId ? (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 h-[12%]",
            OVERLAY_KIND_STYLES.ticker.dot
          )}
        />
      ) : null}
    </span>
  )
}

/** Saved Looks, listed like songs. Tapping one replaces Preview with it. */
export function OverlayLooks({
  onSave,
  onEdit,
}: {
  onSave: () => void
  onEdit: (lookId: string) => void
}) {
  const config = useBroadcastStore((state) => state.overlayConfig)
  const staged = useBroadcastStore((state) => state.stagedOverlays)
  const active = useBroadcastStore((state) => state.activeOverlays)
  const graphicsOnAir = useOverlayOutputLive()
  const stagedSelection = resolveOverlaySelection(config, staged)
  const activeSelection = resolveOverlaySelection(config, active)

  return (
    <section aria-labelledby="overlay-looks-heading" className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="overlay-looks-heading"
          className="text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase"
        >
          Saved Looks
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={onSave}>
          <BookmarkPlusIcon /> Save Preview as a Look
        </Button>
      </div>
      {config.looks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground">
          No Looks yet. Tap pads to build Preview, then save it as a Look for
          each part of the service, like Welcome or Sermon.
        </p>
      ) : (
        <div className="grid gap-1">
          {config.looks.map((look) => {
            const selection = overlaySelectionFromLook(config, look)
            const selected = overlaySelectionsMatch(selection, stagedSelection)
            const live =
              graphicsOnAir &&
              overlaySelectionsMatch(selection, activeSelection)
            return (
              <div key={look.id} className="group relative">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Put ${look.name} in Preview`}
                  onClick={() =>
                    useBroadcastStore.getState().stageOverlayLook(look.id)
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-2 pr-11 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected
                      ? "border-primary bg-muted/40 ring-1 ring-primary"
                      : "border-transparent"
                  )}
                >
                  <LookThumbnail look={look} />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {look.name}
                      </span>
                      {live ? (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-red-500 uppercase">
                          Live
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {lookSummary(config, look)}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Edit ${look.name} Look`}
                  title="Edit Look"
                  onClick={() => onEdit(look.id)}
                >
                  <PencilIcon />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
