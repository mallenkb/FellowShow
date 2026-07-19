import { useEffect, useState } from "react"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  getOutputProgramPayload,
  MAX_BROADCAST_OUTPUTS,
  outputContentLabel,
  resolveOutputThemeId,
  type OutputContent,
} from "@/lib/broadcast-outputs"
import {
  isOutputOn,
  setOutputEnabled,
  stopOutput,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import { openBroadcastSettings } from "@/lib/broadcast-settings-dialog"
import { getOverlayPayloadForOutput } from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  MonitorIcon,
  MonitorOffIcon,
  PlusIcon,
  RadioIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react"

type DisplaysPanelMode =
  | "book"
  | "context"
  | "songs"
  | "announcements"
  | "presentation"
  | "timer"
  | "on-display"

function contentForMode(mode: DisplaysPanelMode): OutputContent | null {
  switch (mode) {
    case "songs":
      return "songs"
    case "announcements":
      return "announcements"
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
  const previewVerse = useBroadcastStore((s) => s.previewVerse)
  const previewTimer = useBroadcastStore((s) => s.previewTimer)
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const presenterTimer = useBroadcastStore((s) => s.presenterTimer)
  const lowerThird = useBroadcastStore((s) => s.lowerThird)
  const overlayConfig = useBroadcastStore((s) => s.overlayConfig)
  const activeOverlays = useBroadcastStore((s) => s.activeOverlays)
  const runtimeById = useOutputRuntimeStore((s) => s.byId)
  const [isOpen, setIsOpen] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [draggedOutputId, setDraggedOutputId] = useState<string | null>(null)
  const [removeOutputId, setRemoveOutputId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const tabContent = contentForMode(mode)
  const onCount = outputs.filter((output) =>
    isOutputOn(runtimeById[output.id])
  ).length
  const orderedOutputs = outputs
    .map((output, configuredIndex) => ({
      output,
      configuredIndex,
      active: isOutputOn(runtimeById[output.id]),
    }))
    .sort(
      (left, right) =>
        Number(right.active) - Number(left.active) ||
        left.configuredIndex - right.configuredIndex
    )
    .map(({ output }) => output)

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

  const reorderOutput = (targetOutputId: string) => {
    if (!draggedOutputId || draggedOutputId === targetOutputId) return

    const draggedIsOn = isOutputOn(runtimeById[draggedOutputId])
    const targetIsOn = isOutputOn(runtimeById[targetOutputId])
    if (draggedIsOn !== targetIsOn) return

    const orderedIds = orderedOutputs.map((output) => output.id)
    const fromIndex = orderedIds.indexOf(draggedOutputId)
    const toIndex = orderedIds.indexOf(targetOutputId)
    if (fromIndex === -1 || toIndex === -1) return

    const nextIds = [...orderedIds]
    const [movedId] = nextIds.splice(fromIndex, 1)
    nextIds.splice(toIndex, 0, movedId)
    useBroadcastStore.getState().reorderOutputs(nextIds)
    setDraggedOutputId(null)
  }

  const removeSelectedOutput = () => {
    const output = outputs.find((item) => item.id === removeOutputId)
    if (!output) return

    setPendingId(output.id)
    void stopOutput(output).finally(() => {
      useOutputRuntimeStore.getState().removeRuntime(output.id)
      if (output.id === "main") {
        useBroadcastStore.getState().updateOutput(output.id, {
          monitorIndex: null,
        })
      } else {
        useBroadcastStore.getState().removeOutput(output.id)
      }
      setPendingId(null)
      setRemoveOutputId(null)
    })
  }

  const removeCandidate =
    outputs.find((output) => output.id === removeOutputId) ?? null

  return (
    <div
      data-slot="outputs-multiview-panel"
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex h-11 shrink-0 items-center border-b border-border">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-full min-w-0 flex-1 items-center justify-between gap-2 px-3 text-left transition hover:bg-muted/35"
          aria-expanded={isOpen}
        >
          <span className="min-w-0 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Displays · {onCount} of {outputs.length} on
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !isOpen && "-rotate-90"
            )}
          />
        </button>
        {outputs.length > 1 && (
          <Button
            variant={isReordering ? "secondary" : "ghost"}
            size="xs"
            onClick={() => {
              setIsReordering((reordering) => !reordering)
              setDraggedOutputId(null)
            }}
            className="h-6 gap-1 px-1.5 text-[0.625rem] text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDownIcon className="size-3" />
            {isReordering ? "Done" : "Reorder"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => openBroadcastSettings()}
          className="h-6 gap-1 px-1.5 text-[0.625rem] text-muted-foreground hover:text-foreground"
        >
          <Settings2Icon className="size-3" />
          Manage
        </Button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-3 gap-2 p-2">
          {orderedOutputs.map((output, index) => {
            const mirrorsSongPreview = output.content === "songs"
            const outputVerse = mirrorsSongPreview ? previewVerse : liveVerse
            const outputTimer = mirrorsSongPreview
              ? previewTimer
              : presenterTimer
            const themeId = resolveOutputThemeId(
              output,
              themeState,
              outputVerse,
              selectedThemeSection
            )
            const theme = themes.find((t) => t.id === themeId) ?? themes[0]
            const { verse, timer } = getOutputProgramPayload(
              output.content,
              mirrorsSongPreview || isLive,
              outputVerse,
              outputTimer
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
                draggable={isReordering}
                onDragStart={(event) => {
                  if (!isReordering) return
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", output.id)
                  setDraggedOutputId(output.id)
                }}
                onDragOver={(event) => {
                  if (!isReordering) return
                  const draggedIsOn = draggedOutputId
                    ? isOutputOn(runtimeById[draggedOutputId])
                    : active
                  if (draggedIsOn !== active) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  reorderOutput(output.id)
                }}
                onDragEnd={() => setDraggedOutputId(null)}
                className={cn(
                  "overflow-hidden rounded-md border bg-background transition-all",
                  isReordering &&
                    "cursor-grab ring-1 ring-border active:cursor-grabbing",
                  draggedOutputId === output.id && "opacity-50",
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
                      overlays={
                        active
                          ? getOverlayPayloadForOutput(
                              overlayConfig,
                              activeOverlays,
                              output.id,
                              {
                                verse: active ? verse : null,
                                timer: active ? timer : null,
                              }
                            )
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
                      <span className="text-[0.625rem] text-white/80">
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
                  {isReordering && (
                    <span className="absolute top-1 right-4 flex size-5 items-center justify-center rounded bg-black/65 text-white">
                      <GripVerticalIcon className="size-3.5" />
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1.5 border-t border-border bg-card px-1.5 py-1">
                  <button
                    type="button"
                    disabled={isReordering}
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openBroadcastSettings(output.id)}
                    title={`Manage ${output.name}`}
                  >
                    <div className="truncate text-[0.6875rem] font-medium">
                      {output.name}
                    </div>
                    <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
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
                  {(output.id !== "main" ||
                    (output.outputType === "display" &&
                      output.monitorIndex !== null)) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={pending || isReordering}
                      onClick={() => setRemoveOutputId(output.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={
                        output.id === "main"
                          ? `Disconnect ${output.name} from its screen`
                          : `Remove ${output.name}`
                      }
                      title={
                        output.id === "main"
                          ? "Disconnect screen"
                          : `Remove ${output.name}`
                      }
                    >
                      {output.id === "main" ? (
                        <MonitorOffIcon className="size-3" />
                      ) : (
                        <Trash2Icon className="size-3" />
                      )}
                    </Button>
                  )}
                  <Switch
                    checked={active}
                    disabled={pending || isReordering}
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
          {outputs.length < MAX_BROADCAST_OUTPUTS && (
            <button
              type="button"
              onClick={() => openBroadcastSettings()}
              className="flex aspect-video flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
            >
              <PlusIcon className="size-4" />
              <span className="text-[0.625rem] font-medium">Add display</span>
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={removeCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveOutputId(null)
        }}
        title={
          removeCandidate?.id === "main"
            ? "Disconnect Program screen?"
            : "Remove display?"
        }
        description={
          removeCandidate
            ? removeCandidate.id === "main"
              ? "Program will be turned off on its external screen and the screen assignment will be cleared. The internal Program feed will remain available."
              : `“${removeCandidate.name}” will be turned off and removed from Displays.`
            : undefined
        }
        confirmLabel={removeCandidate?.id === "main" ? "Disconnect" : "Remove"}
        destructive
        onConfirm={removeSelectedOutput}
      />
    </div>
  )
}
