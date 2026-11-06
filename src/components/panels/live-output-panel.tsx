import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Switch } from "@/components/ui/switch"
import { LIVE_STATUS_TEXT_CLASS } from "@/components/ui/live-status-styles"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import { resolveOverlayOutput } from "@/lib/overlay-live"
import { graphicsKeyMode } from "@/lib/broadcast-outputs"
import {
  getCurrentOverlayScripture,
  getOverlayPayloadForOutput,
  getOverlayPreviewPayload,
  programHidesGraphics,
} from "@/lib/overlays"

type LiveOutputMode =
  "book" | "context" | "songs" | "announcements" | "presentation" | "on-display"

export function LiveOutputPanel({
  mode,
  overlayActionPending,
}: {
  mode: LiveOutputMode
  overlayActionPending?: boolean
}) {
  const isLive = useBroadcastStore((s) => s.isLive)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const lowerThird = useBroadcastStore((s) => s.lowerThird)
  const overlayConfig = useBroadcastStore((s) => s.overlayConfig)
  const activeOverlays = useBroadcastStore((s) => s.activeOverlays)
  const outputs = useBroadcastStore((s) => s.outputs)
  const selectedOverlayOutputId = useBroadcastStore(
    (s) => s.selectedOverlayOutputId
  )
  // Graphics sent from any tab show here while their output is on air, so
  // the operator sees that something went live.
  const graphicsOutput = resolveOverlayOutput(outputs, selectedOverlayOutputId)
  const graphicsLive = useOverlayOutputLive(graphicsOutput?.id ?? null)
  const showsSomething = isLive || graphicsLive
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const previewVerse = useBroadcastStore((s) => s.previewVerse)

  const activeTheme = getThemeForProgramContent(
    {
      activeThemeId,
      sectionThemeIds,
      themes,
    },
    liveVerse,
    mode === "songs"
      ? "songs"
      : mode === "announcements"
        ? "announcements"
        : mode === "presentation"
          ? "presentation"
          : "bible"
  )
  const takePreviewLive = (checked: boolean) => {
    if (overlayActionPending) return
    const store = useBroadcastStore.getState()
    if (checked) {
      store.takePreviewLive("manual")
      return
    }
    store.setLive(false)
  }

  return (
    <div
      data-slot="live-output-panel"
      className="flex shrink-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 bg-surface-header px-3">
        <span
          className="min-w-0 truncate text-xs font-semibold text-foreground"
          title="Live output"
        >
          Live output
        </span>
        <label className="flex shrink-0 items-center justify-end gap-2">
          <span
            className={cn(
              "text-[0.625rem] font-medium tracking-wider whitespace-nowrap uppercase transition-colors",
              isLive || graphicsLive
                ? LIVE_STATUS_TEXT_CLASS
                : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {isLive ? "Live" : graphicsLive ? "Graphics live" : "Off air"}
          </span>
          <Switch
            aria-label="Program on air"
            checked={isLive}
            disabled={overlayActionPending}
            onCheckedChange={takePreviewLive}
            className="data-[state=checked]:bg-red-500"
          />
        </label>
      </div>

      <div className="relative z-0 aspect-video w-full shrink-0 overflow-hidden">
        <CanvasVerse
          theme={activeTheme}
          // With only graphics on air, show just what goes out: no leftover
          // scripture, song or media from the last time Program was live.
          verse={isLive || !graphicsLive ? liveVerse : null}
          lowerThird={isLive ? lowerThird : null}
          overlays={
            graphicsLive && graphicsOutput
              ? // Live graphics are the master bus: every live graphic shows,
                // except while Program has its own content (one at a time).
                isLive && programHidesGraphics(liveVerse)
                ? null
                : getOverlayPreviewPayload(
                    overlayConfig,
                    activeOverlays,
                    undefined,
                    {
                      scripture: getCurrentOverlayScripture({
                        isLive,
                        liveVerse,
                        previewVerse,
                      }),
                    }
                  )
              : isLive
                ? getOverlayPayloadForOutput(
                    overlayConfig,
                    activeOverlays,
                    "main",
                    { verse: liveVerse }
                  )
                : null
          }
          // With only graphics on air, show the keyable background they go
          // out on, not a placeholder.
          overlayMode={
            !isLive && graphicsLive && graphicsOutput
              ? graphicsKeyMode(graphicsOutput)
              : undefined
          }
          className={cn(
            "h-full transition-opacity",
            !showsSomething && "opacity-40"
          )}
          fillContainer
          fit="contain"
        />
        {!showsSomething && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center dark:opacity-40">
            <span className="rounded bg-foreground px-2 py-0.5 text-[0.6875rem] font-semibold tracking-widest text-background uppercase dark:bg-background/70 dark:text-muted-foreground">
              Off air
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
