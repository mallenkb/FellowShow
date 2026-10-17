import { useState } from "react"
import { RadioIcon, SquareIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
  stopOverlayOutputLive,
} from "@/lib/overlay-live"
import { overlaySelectionsMatch, resolveOverlaySelection } from "@/lib/overlays"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import type { ActiveOverlayState, OverlayConfiguration } from "@/types"
import { OVERLAY_KIND_STYLES, type OverlayPadKind } from "./overlay-kind-styles"

interface LiveGraphic {
  kind: OverlayPadKind
  name: string
  takeOff: () => void
}

function liveGraphics(
  config: OverlayConfiguration,
  active: ActiveOverlayState
): LiveGraphic[] {
  const store = useBroadcastStore.getState()
  const items: LiveGraphic[] = []
  if (active.logoVisible) {
    items.push({
      kind: "logo",
      name:
        config.logo.logos.length === 1
          ? (config.logo.logos[0]?.name ?? "Logo")
          : `${config.logo.logos.length} logos`,
      takeOff: () => store.setLogoOverlayVisible(false),
    })
  }
  const bar = config.bars.find((item) => item.id === active.barId)
  if (bar) {
    items.push({ kind: "bar", name: bar.name, takeOff: store.clearBarOverlay })
  }
  if (active.lowerThird) {
    items.push({
      kind: "lowerThird",
      name: active.lowerThird.preset.name,
      takeOff: store.clearLowerThirdOverlay,
    })
  }
  const ticker = config.tickerMessages.find(
    (item) => item.id === active.tickerMessageId
  )
  if (ticker) {
    items.push({
      kind: "ticker",
      name: ticker.text,
      takeOff: store.stopTickerMessage,
    })
  }
  return items
}

/** What the congregation sees right now, with one action to change it. */
export function OverlayLiveNow() {
  const config = useBroadcastStore((state) => state.overlayConfig)
  const active = useBroadcastStore((state) => state.activeOverlays)
  const staged = useBroadcastStore((state) => state.stagedOverlays)
  const outputs = useBroadcastStore((state) => state.outputs)
  const selectedOutputId = useBroadcastStore(
    (state) => state.selectedOverlayOutputId
  )
  const onAir = useOverlayOutputLive()
  const [busy, setBusy] = useState(false)
  const output = resolveOverlayOutput(outputs, selectedOutputId)
  const resolvedActive = resolveOverlaySelection(config, active)
  const resolvedStaged = resolveOverlaySelection(config, staged)
  const items = onAir ? liveGraphics(config, resolvedActive) : []
  const pending =
    onAir && !overlaySelectionsMatch(resolvedStaged, resolvedActive)
  const previewEmpty =
    !resolvedStaged.logoVisible &&
    !resolvedStaged.tickerMessageId &&
    !resolvedStaged.lowerThird &&
    !resolvedStaged.barId

  const run = async (action: "show" | "stop") => {
    if (!output || busy) return
    setBusy(true)
    try {
      if (action === "stop") await stopOverlayOutputLive(output.id)
      else await showOverlayPreviewOnLive(output.id)
    } catch {
      // The output runtime already reports an actionable toast.
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="overlay-live-heading"
      className={cn(
        "overflow-hidden rounded-lg border",
        onAir ? "border-red-500/40 bg-red-500/5" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <h3
          id="overlay-live-heading"
          className={cn(
            "inline-flex items-center gap-2 text-[0.6875rem] font-semibold tracking-wider uppercase",
            onAir ? "text-red-500" : "text-muted-foreground"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              onAir ? "animate-pulse bg-red-500" : "bg-muted-foreground/50"
            )}
          />
          {onAir ? "On air" : "Off air"}
        </h3>
        {onAir && !pending ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-red-500 hover:text-red-500"
            disabled={busy}
            onClick={() => void run("stop")}
          >
            <SquareIcon className="size-3" /> Stop
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7"
            disabled={busy || !output || (previewEmpty && !onAir)}
            onClick={() => void run("show")}
          >
            <RadioIcon className="size-3.5" />
            {pending ? "Update Live" : "Show on Live"}
          </Button>
        )}
      </div>
      {items.length > 0 ? (
        <ul className="grid gap-1 border-t border-border/60 p-1.5">
          {items.map((item) => (
            <li
              key={item.kind}
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  OVERLAY_KIND_STYLES[item.kind].dot
                )}
              />
              <span
                className={cn(
                  "shrink-0 text-[0.6875rem] font-medium",
                  OVERLAY_KIND_STYLES[item.kind].text
                )}
              >
                {OVERLAY_KIND_STYLES[item.kind].label}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-xs"
                title={item.name}
              >
                {item.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 shrink-0 text-muted-foreground"
                aria-label={`Take ${item.name} off Live`}
                title="Take off Live"
                onClick={item.takeOff}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : onAir ? (
        <p className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
          Nothing showing
        </p>
      ) : null}
    </section>
  )
}
