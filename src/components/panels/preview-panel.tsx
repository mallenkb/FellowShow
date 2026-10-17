import { useCallback, useEffect, useMemo, useState } from "react"
import { RadioIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { PanelHeader } from "@/components/ui/panel-header"
import { bibleActions } from "@/hooks/use-bible"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import { stageVerse } from "@/lib/preview-staging"
import {
  getOverlayOutputMode,
  resolveOutputThemeId,
} from "@/lib/broadcast-outputs"
import {
  getCurrentOverlayScripture,
  getOverlayPayloadForOutput,
  getOverlayPreviewPayload,
  overlaySelectionsMatch,
  resolveOverlaySelection,
} from "@/lib/overlays"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
  stopOverlayOutputLive,
} from "@/lib/overlay-live"
import {
  useBibleStore,
  useBroadcastStore,
  usePresenterTimerStore,
} from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
import { hasSameProgramPayload } from "@/stores/broadcast-store-helpers"
import type { PresenterTimerRenderData, VerseRenderData } from "@/types"
import { sectionFromMode, type ThemeAwareMode } from "./preview-panel-shared"

export function PreviewPanel({ mode }: { mode: ThemeAwareMode }) {
  const isOverlayPreview = mode === "on-display"
  const [isShowingOverlayLive, setIsShowingOverlayLive] = useState(false)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)

  // When the translation changes, reload the selected verse in the new
  // translation, and restage it if Preview is still showing that verse.
  useEffect(() => {
    const verse = useBibleStore.getState().selectedVerse
    if (
      !verse ||
      verse.book_number <= 0 ||
      verse.chapter <= 0 ||
      verse.verse <= 0
    ) {
      return
    }
    const staged = useBroadcastStore.getState().previewVerse
    const previewShowsVerse =
      staged?.themeSection === "bible" &&
      staged.segments[0]?.verseNumber === verse.verse &&
      staged.segments[0]?.text === verse.text
    void bibleActions
      .fetchVerse(verse.book_number, verse.chapter, verse.verse)
      .then((next) => {
        if (!next) return
        bibleActions.selectVerse(next)
        if (previewShowsVerse) stageVerse(next)
      })
      .catch((error: unknown) => {
        console.error("[preview] Failed to reload verse", error)
      })
  }, [activeTranslationId])
  const themes = useBroadcastStore((s) => s.themes)
  const outputs = useBroadcastStore((s) => s.outputs)
  const selectedOverlayOutputId = useBroadcastStore(
    (s) => s.selectedOverlayOutputId
  )
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const previewVerse = useBroadcastStore((s) => s.previewVerse)
  const previewTimer = useBroadcastStore((s) => s.previewTimer)
  const isProgramLive = useBroadcastStore((s) => s.isLive)
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const presenterTimer = useBroadcastStore((s) => s.presenterTimer)
  const overlayConfig = useBroadcastStore((s) => s.overlayConfig)
  const activeOverlays = useBroadcastStore((s) => s.activeOverlays)
  const stagedOverlays = useBroadcastStore((s) => s.stagedOverlays)
  const timerTotal = usePresenterTimerStore((s) => s.totalSeconds)
  const timerRemaining = usePresenterTimerStore((s) => s.remainingSeconds)
  const timerIsRunning = usePresenterTimerStore((s) => s.isRunning)
  const timerFontFamily = usePresenterTimerStore((s) => s.fontFamily)
  const timerBackgroundUrl = usePresenterTimerStore((s) => s.backgroundUrl)
  const timerBackgroundOptions = usePresenterTimerStore(
    (s) => s.backgroundOptions
  )

  const timer = useMemo(() => {
    if (!timerIsRunning && timerRemaining === timerTotal) return null
    const timerBackground = timerBackgroundOptions.find(
      (option) => option.url === timerBackgroundUrl
    )
    return {
      remainingSeconds: timerRemaining,
      totalSeconds: timerTotal,
      isRunning: timerIsRunning,
      isFinished: timerRemaining === 0,
      fontFamily: timerFontFamily,
      backgroundUrl: timerBackgroundUrl,
      backgroundMediaType: timerBackground?.mediaType ?? "image",
      backgroundPlaybackStartedAt: timerBackground?.playbackStartedAt,
    }
  }, [
    timerBackgroundOptions,
    timerBackgroundUrl,
    timerFontFamily,
    timerIsRunning,
    timerRemaining,
    timerTotal,
  ])
  const activeTheme = getThemeForProgramContent(
    {
      activeThemeId: sectionThemeIds.bible,
      sectionThemeIds,
      themes,
    },
    previewVerse,
    sectionFromMode(mode)
  )
  const overlayOutput = useMemo(
    () =>
      isOverlayPreview
        ? resolveOverlayOutput(outputs, selectedOverlayOutputId)
        : null,
    [isOverlayPreview, outputs, selectedOverlayOutputId]
  )
  const overlayPreviewTheme = useMemo(() => {
    if (!overlayOutput) return activeTheme
    const themeId = resolveOutputThemeId(
      overlayOutput,
      {
        activeThemeId: sectionThemeIds.bible,
        sectionThemeIds,
      },
      null,
      "bible"
    )
    return themes.find((theme) => theme.id === themeId) ?? activeTheme
  }, [activeTheme, overlayOutput, sectionThemeIds, themes])
  const overlayMode = overlayOutput ? getOverlayOutputMode(overlayOutput) : null
  const overlayOutputIsLive = useOverlayOutputLive(overlayOutput?.id ?? null)
  // Video Overlays Preview shows what is staged, not what is on air.
  const resolvedStaged = resolveOverlaySelection(overlayConfig, stagedOverlays)
  const overlayPreviewPayload = overlayOutput
    ? getOverlayPreviewPayload(overlayConfig, resolvedStaged, undefined, {
        scripture: getCurrentOverlayScripture({
          isLive: isProgramLive,
          liveVerse,
          previewVerse,
        }),
        holdForPreview: true,
      })
    : null
  const overlayChangesPending =
    overlayOutputIsLive &&
    !overlaySelectionsMatch(
      resolvedStaged,
      resolveOverlaySelection(overlayConfig, activeOverlays)
    )

  useEffect(() => {
    if (
      !isOverlayPreview ||
      !overlayOutput ||
      selectedOverlayOutputId === overlayOutput.id
    ) {
      return
    }
    useBroadcastStore.getState().setSelectedOverlayOutputId(overlayOutput.id)
  }, [isOverlayPreview, overlayOutput, selectedOverlayOutputId])

  const setPreview = useCallback(
    (verse: VerseRenderData | null, timer: PresenterTimerRenderData | null) => {
      useBroadcastStore.getState().setPreviewOutput(verse, timer)
    },
    []
  )

  useEffect(() => {
    if (isOverlayPreview) return
    if (!previewTimer) return
    setPreview(previewVerse, timer)
  }, [previewTimer, timer, previewVerse, setPreview, isOverlayPreview])

  // When Preview already matches Program, the only useful action is to stop.
  const previewIsOnAir =
    isProgramLive &&
    Boolean(previewVerse || previewTimer) &&
    hasSameProgramPayload(previewVerse, previewTimer, liveVerse, presenterTimer)

  const sendPreviewLive = () => {
    if (isOverlayPreview) return
    const store = useBroadcastStore.getState()
    store.presentOnLive(
      previewVerse,
      previewTimer ? timer : previewTimer,
      "preview"
    )
  }

  const runOverlayLive = async (action: "show" | "stop") => {
    if (!overlayOutput || isShowingOverlayLive) return
    setIsShowingOverlayLive(true)
    try {
      if (action === "stop") await stopOverlayOutputLive(overlayOutput.id)
      else await showOverlayPreviewOnLive(overlayOutput.id)
    } catch {
      // The output runtime already reports an actionable toast.
    } finally {
      setIsShowingOverlayLive(false)
    }
  }

  return (
    <div
      data-slot="preview-panel"
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader
        title={isOverlayPreview ? "Video Overlays Preview" : "Preview"}
      >
        {!isOverlayPreview && previewVerse?.reference && (
          <span className="max-w-[60%] truncate text-[0.6875rem] text-muted-foreground">
            Staged: {previewVerse.reference}
          </span>
        )}
      </PanelHeader>
      <div
        className="relative z-0 aspect-video w-full shrink-0 overflow-hidden"
        onDoubleClick={isOverlayPreview ? undefined : sendPreviewLive}
      >
        {isOverlayPreview && !overlayOutput ? (
          <div className="flex h-full items-center justify-center bg-black px-4 text-center">
            <span className="text-[0.6875rem] text-white/70">
              No Video Overlays output selected.
            </span>
          </div>
        ) : (
          <CanvasVerse
            theme={isOverlayPreview ? overlayPreviewTheme : activeTheme}
            verse={isOverlayPreview ? null : previewVerse}
            timer={isOverlayPreview ? null : previewTimer}
            overlays={
              isOverlayPreview
                ? overlayPreviewPayload
                : isProgramLive
                  ? getOverlayPayloadForOutput(
                      overlayConfig,
                      activeOverlays,
                      "main",
                      { verse: previewVerse, timer: previewTimer }
                    )
                  : null
            }
            overlayMode={
              isOverlayPreview ? (overlayMode ?? undefined) : undefined
            }
            className="h-full"
            fillContainer
            fit="contain"
          />
        )}
      </div>
      {isOverlayPreview ? (
        <div className="relative z-10 border-t border-border bg-card px-3 py-2">
          <div className="flex gap-2">
            {!overlayOutputIsLive || overlayChangesPending ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto min-h-8 flex-1 justify-center gap-2 py-2 text-center whitespace-normal"
                onClick={() => {
                  void runOverlayLive("show")
                }}
                disabled={!overlayOutput || isShowingOverlayLive}
              >
                <RadioIcon className="size-3.5 shrink-0" />
                {overlayChangesPending ? "Update Live" : "Show on Live"}
              </Button>
            ) : null}
            {overlayOutputIsLive ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className={
                  overlayChangesPending
                    ? "h-auto min-h-8 shrink-0 gap-2 py-2"
                    : "h-auto min-h-8 flex-1 justify-center gap-2 py-2"
                }
                onClick={() => {
                  void runOverlayLive("stop")
                }}
                disabled={isShowingOverlayLive}
              >
                <SquareIcon className="size-3.5 shrink-0" />
                {overlayChangesPending ? "Stop" : "Stop Live"}
              </Button>
            ) : null}
          </div>
          <p className="mt-1.5 text-center text-[0.625rem] leading-relaxed text-muted-foreground">
            {!overlayOutput
              ? "Add a Video Overlays output in Displays to enable Show on Live."
              : overlayChangesPending
                ? "Preview has changes. Update Live sends them to the graphics output."
                : overlayOutputIsLive
                  ? "These graphics are live. Changes you make stay in Preview until you press Update Live."
                  : "Preview only. Show on Live sends these graphics to the selected output. Program is not affected."}
          </p>
        </div>
      ) : (
        <div className="relative z-10 border-t border-border bg-card px-3 py-2">
          <div className="flex gap-2">
            {previewIsOnAir ? null : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto min-h-8 flex-1 justify-center gap-2 py-2 text-center whitespace-normal"
                onClick={sendPreviewLive}
                disabled={!previewVerse && !previewTimer}
              >
                <RadioIcon className="size-3.5 shrink-0" />
                Show on Live
              </Button>
            )}
            {isProgramLive ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className={
                  previewIsOnAir
                    ? "h-auto min-h-8 flex-1 justify-center gap-2 py-2"
                    : "h-auto min-h-8 shrink-0 gap-2 py-2"
                }
                onClick={() => useBroadcastStore.getState().setLive(false)}
              >
                <SquareIcon className="size-3.5 shrink-0" />
                {previewIsOnAir ? "Stop Live" : "Stop"}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
