import { useEffect, useState } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  getOutputProgramPayload,
  outputContentLabel,
  resolveOutputThemeId,
  type OutputContent,
} from "@/lib/broadcast-outputs"
import {
  isOutputOn,
  setOutputEnabled,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import { openBroadcastSettings } from "@/lib/broadcast-settings-dialog"
import { useBroadcastStore } from "@/stores"
import { MonitorIcon, RadioIcon, Settings2Icon } from "lucide-react"

type DisplaysPanelMode = "book" | "context" | "songs" | "presentation" | "timer"

function contentForMode(mode: DisplaysPanelMode): OutputContent | null {
  switch (mode) {
    case "songs":
      return "songs"
    case "presentation":
      return "presentation"
    case "timer":
      return "timer"
    case "book":
    case "context":
      return "bible"
    default:
      return null
  }
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window
}

/**
 * Side-panel multiview: labeled tiles for every configured external display.
 * Same strip on every search tab so the operator always sees what each
 * screen is painting — with On/Off without opening Manage.
 */
export function OutputsMultiviewPanel({
  mode = "book",
}: {
  mode?: DisplaysPanelMode
}) {
  const outputs = useBroadcastStore((s) => s.outputs)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const selectedThemeSection = useBroadcastStore((s) => s.selectedThemeSection)
  const isLive = useBroadcastStore((s) => s.isLive)
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const presenterTimer = useBroadcastStore((s) => s.presenterTimer)
  const lowerThird = useBroadcastStore((s) => s.lowerThird)
  const runtimeById = useOutputRuntimeStore((s) => s.byId)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const tabContent = contentForMode(mode)
  const onCount = outputs.filter((output) =>
    isOutputOn(runtimeById[output.id])
  ).length

  // Keep runtime rows in sync with configured outputs.
  useEffect(() => {
    useOutputRuntimeStore.getState().ensureAll(outputs)
  }, [outputs])

  // Reconcile window/NDI truth on mount and while the panel is visible.
  useEffect(() => {
    if (!isTauriRuntime()) return
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      await useOutputRuntimeStore.getState().reconcileAll(outputs)
    }
    void poll()
    const intervalId = setInterval(() => void poll(), 2000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [outputs])

  const themeState = { activeThemeId, sectionThemeIds }

  const handleToggle = async (outputId: string, enabled: boolean) => {
    const output = outputs.find((item) => item.id === outputId)
    if (!output || pendingId) return
    setPendingId(outputId)
    try {
      await setOutputEnabled(output, enabled)
    } catch {
      // The output runtime already reports an actionable toast.
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div
      data-slot="outputs-multiview-panel"
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader
        title={
          onCount > 0
            ? `Displays · ${onCount} on`
            : `Displays · ${outputs.length}`
        }
      >
        <Button
          variant="ghost"
          size="xs"
          onClick={() => openBroadcastSettings()}
          className="h-6 gap-1 px-1.5 text-[0.625rem] text-muted-foreground hover:text-foreground"
        >
          <Settings2Icon className="size-3" />
          Manage
        </Button>
      </PanelHeader>

      <div className="grid grid-cols-3 gap-2 p-2">
        {outputs.map((output, index) => {
          const themeId = resolveOutputThemeId(
            output,
            themeState,
            liveVerse,
            selectedThemeSection
          )
          const theme = themes.find((t) => t.id === themeId) ?? themes[0]
          const { verse, timer } = getOutputProgramPayload(
            output.content,
            isLive,
            liveVerse,
            presenterTimer
          )
          const runtime = runtimeById[output.id]
          const active = isOutputOn(runtime)
          // Highlight the dedicated screen for the current search tab.
          const matchesTab =
            tabContent !== null && output.content === tabContent
          const showingContent = Boolean(verse || timer)
          const pending = pendingId === output.id

          return (
            <div
              key={output.id}
              className={cn(
                "overflow-hidden rounded-md border bg-background transition-shadow",
                matchesTab && active
                  ? "border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.45)]"
                  : active
                    ? "border-emerald-500/35"
                    : "border-border"
              )}
            >
              <div className="relative aspect-video">
                {theme && (
                  <CanvasVerse
                    theme={theme}
                    verse={active ? verse : null}
                    timer={active ? timer : null}
                    lowerThird={
                      active && output.content === "everything"
                        ? lowerThird
                        : null
                    }
                    className={cn("h-full", !active && "opacity-40")}
                    fillContainer
                  />
                )}
                {!active && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
                    <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                      Off
                    </span>
                  </div>
                )}
                {active && !showingContent && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1">
                    <span className="text-[0.5625rem] text-white/80">
                      Waiting
                    </span>
                  </div>
                )}
                <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[0.625rem] leading-4 font-semibold text-white">
                  {index + 1} · {outputContentLabel(output.content)}
                </span>
                <span
                  role="status"
                  aria-label={
                    active ? `${output.name} is on` : `${output.name} is off`
                  }
                  className={cn(
                    "absolute top-1.5 right-1.5 size-1.5 rounded-full",
                    active
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                      : "bg-zinc-600"
                  )}
                />
              </div>
              <div className="flex items-center justify-between gap-1.5 border-t border-border bg-card px-1.5 py-1">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openBroadcastSettings(output.id)}
                  title={`Manage ${output.name}`}
                >
                  <div className="truncate text-[0.625rem] font-medium">
                    {output.name}
                  </div>
                  <div className="flex items-center gap-1 text-[0.5625rem] text-muted-foreground">
                    {output.outputType === "ndi" ? (
                      <RadioIcon className="size-2.5 shrink-0" />
                    ) : (
                      <MonitorIcon className="size-2.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {active
                        ? showingContent
                          ? "Live"
                          : "On · waiting"
                        : output.outputType === "ndi"
                          ? "NDI"
                          : output.monitorIndex !== null
                            ? `Screen ${output.monitorIndex + 1}`
                            : "No screen"}
                    </span>
                  </div>
                </button>
                <Switch
                  checked={active}
                  disabled={pending}
                  onCheckedChange={(checked) =>
                    void handleToggle(output.id, checked)
                  }
                  aria-label={`Turn ${output.name} ${active ? "off" : "on"}`}
                  className="scale-90"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
