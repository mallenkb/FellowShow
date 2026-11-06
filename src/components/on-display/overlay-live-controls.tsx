import { useState } from "react"
import { LiveActionButton } from "@/components/ui/live-action-button"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
  stopOverlayOutputLive,
} from "@/lib/overlay-live"
import { overlaySelectionsMatch, resolveOverlaySelection } from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"

export function OverlayLiveControls() {
  const outputs = useBroadcastStore((state) => state.outputs)
  const selectedOutputId = useBroadcastStore(
    (state) => state.selectedOverlayOutputId
  )
  const config = useBroadcastStore((state) => state.overlayConfig)
  const staged = useBroadcastStore((state) => state.stagedOverlays)
  const active = useBroadcastStore((state) => state.activeOverlays)
  const output = resolveOverlayOutput(outputs, selectedOutputId)
  const onAir = useOverlayOutputLive(output?.id ?? null)
  const [busy, setBusy] = useState(false)
  const preview = resolveOverlaySelection(config, staged)
  const live = resolveOverlaySelection(config, active)
  const pending = onAir && !overlaySelectionsMatch(preview, live)
  const previewEmpty =
    !preview.logoVisible &&
    !preview.tickerMessageId &&
    !preview.lowerThird &&
    !preview.barId

  const run = async (action: "show" | "stop") => {
    if (!output || busy) return
    setBusy(true)
    try {
      if (action === "stop") await stopOverlayOutputLive(output.id)
      else await showOverlayPreviewOnLive(output.id)
    } catch {
      // The output runtime reports the failure.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-t border-border px-3 py-2">
      {!onAir || pending ? (
        <LiveActionButton
          action={pending ? "update" : "show"}
          className="flex-1"
          aria-label={
            pending ? "Update graphics on Live" : "Show graphics on Live"
          }
          disabled={busy || !output || (previewEmpty && !onAir)}
          onClick={() => void run("show")}
        />
      ) : null}
      {onAir ? (
        <LiveActionButton
          action={pending ? "stop" : "stop-live"}
          className="flex-1"
          aria-label="Stop graphics on Live"
          disabled={busy}
          onClick={() => void run("stop")}
        />
      ) : null}
    </div>
  )
}
