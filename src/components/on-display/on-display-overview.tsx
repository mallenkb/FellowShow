import { useState } from "react"
import { resolveOverlaySelection } from "@/lib/overlays"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import type { ActiveOverlayState, OverlayConfiguration } from "@/types"
import { DskOutputControls } from "@/components/on-display/dsk-output-controls"
import { OVERLAY_KIND_STYLES, type OverlayPadKind } from "./overlay-kind-styles"
import { OverlayLookDialog } from "./overlay-look-dialog"
import { OverlayLooks } from "./overlay-looks"

function liveGraphics(
  config: OverlayConfiguration,
  active: ActiveOverlayState
): { kind: OverlayPadKind; name: string }[] {
  const items: { kind: OverlayPadKind; name: string }[] = []
  if (active.logoVisible) items.push({ kind: "logo", name: "Logo" })
  const bar = config.bars.find((item) => item.id === active.barId)
  if (bar) items.push({ kind: "bar", name: bar.name })
  if (active.lowerThird) {
    items.push({ kind: "lowerThird", name: active.lowerThird.preset.name })
  }
  const ticker = config.tickerMessages.find(
    (item) => item.id === active.tickerMessageId
  )
  if (ticker) items.push({ kind: "ticker", name: ticker.text })
  return items
}

/** Left panel of the Video Overlays tab: output, what is live, and Looks. */
export function OnDisplayOverview() {
  const config = useBroadcastStore((state) => state.overlayConfig)
  const active = useBroadcastStore((state) => state.activeOverlays)
  const graphicsOnAir = useOverlayOutputLive()
  const [lookEditor, setLookEditor] = useState({
    open: false,
    id: null as string | null,
    key: 0,
  })
  const openLook = (id: string | null) =>
    setLookEditor((state) => ({ open: true, id, key: state.key + 1 }))
  const live = graphicsOnAir
    ? liveGraphics(config, resolveOverlaySelection(config, active))
    : []

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Tap a Look or the pads to build Preview, then press Show on Live.
      </p>
      <DskOutputControls />
      <section aria-labelledby="overlay-live-heading" className="grid gap-2">
        <h3
          id="overlay-live-heading"
          className="text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase"
        >
          Live now
        </h3>
        {live.length === 0 ? (
          <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
            {graphicsOnAir
              ? "The graphics output is on air with nothing showing."
              : "Graphics are off air."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {live.map((item) => (
              <span
                key={item.kind}
                title={item.name}
                className={cn(
                  "inline-flex max-w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1 text-xs",
                  OVERLAY_KIND_STYLES[item.kind].tile
                )}
              >
                <span className="inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-semibold text-red-500 uppercase">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current"
                  />
                  Live
                </span>
                <span className="max-w-48 min-w-0 truncate">
                  {item.kind === "ticker" ? "Scrolling text" : item.name}
                </span>
              </span>
            ))}
          </div>
        )}
      </section>
      <OverlayLooks onSave={() => openLook(null)} onEdit={openLook} />
      <OverlayLookDialog
        key={lookEditor.key}
        lookId={lookEditor.id}
        open={lookEditor.open}
        onOpenChange={(open) => setLookEditor((state) => ({ ...state, open }))}
      />
    </div>
  )
}
