import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { LiveActionButton } from "@/components/ui/live-action-button"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { PreviewFooter } from "@/components/panels/preview-footer"
import { bibleActions } from "@/hooks/use-bible"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import { stageVerse } from "@/lib/preview-staging"
import { graphicsKeyMode, resolveOutputThemeId } from "@/lib/broadcast-outputs"
import {
  getCurrentOverlayScripture,
  getOverlayPayloadForOutput,
  getOverlayPreviewPayload,
  programHidesGraphics,
  overlaySelectionsMatch,
  resolveOverlaySelection,
} from "@/lib/overlays"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
  stopOverlayOutputLive,
} from "@/lib/overlay-live"
import { useBibleStore, useBroadcastStore } from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
import { hasSameProgramPayload } from "@/stores/broadcast-store-helpers"
import { sectionFromMode, type ThemeAwareMode } from "./preview-panel-shared"

export function PreviewPanel({
  mode,
  previewMode,
  onPreviewModeChange,
  overlayActionPending,
  onOverlayActionPendingChange,
}: {
  mode: ThemeAwareMode
  previewMode?: "content" | "overlays"
  onPreviewModeChange?: (mode: "content" | "overlays") => void
  overlayActionPending?: boolean
  onOverlayActionPendingChange?: (pending: boolean) => void
}) {
  const isOverlayPreview = previewMode
    ? previewMode === "overlays"
    : mode === "on-display"
  const [localOverlayActionPending, setLocalOverlayActionPending] =
    useState(false)
  const isOverlayActionPending =
    overlayActionPending ?? localOverlayActionPending
  const setOverlayActionPending =
    onOverlayActionPendingChange ?? setLocalOverlayActionPending
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
  const isProgramLive = useBroadcastStore((s) => s.isLive)
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const overlayConfig = useBroadcastStore((s) => s.overlayConfig)
  const activeOverlays = useBroadcastStore((s) => s.activeOverlays)
  const stagedOverlays = useBroadcastStore((s) => s.stagedOverlays)
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
  const overlayMode = overlayOutput ? graphicsKeyMode(overlayOutput) : null
  const overlayOutputIsLive = useOverlayOutputLive(overlayOutput?.id ?? null)
  // Video Overlays Preview shows what is staged, not what is on air.
  const resolvedStaged = resolveOverlaySelection(overlayConfig, stagedOverlays)
  const overlayPreviewEmpty =
    !resolvedStaged.logoVisible &&
    !resolvedStaged.tickerMessageId &&
    !resolvedStaged.lowerThird &&
    !resolvedStaged.barId
  // Every tab's Preview shows the graphics in Preview, so a bar or scrolling
  // text sent from Sermon, Notes or Songs is visible here too.
  const graphicsOutput =
    overlayOutput ?? resolveOverlayOutput(outputs, selectedOverlayOutputId)
  const overlayPreviewPayload = graphicsOutput
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

  // When Preview already matches Program, the only useful action is to stop.
  const previewIsOnAir =
    isProgramLive &&
    Boolean(previewVerse) &&
    hasSameProgramPayload(previewVerse, liveVerse)

  const sendPreviewLive = () => {
    if (isOverlayPreview || isOverlayActionPending) return
    const store = useBroadcastStore.getState()
    store.presentOnLive(previewVerse, "preview")
  }

  const runOverlayLive = (action: "show" | "stop") => {
    if (!overlayOutput || isOverlayActionPending) return
    setOverlayActionPending(true)
    const operation =
      action === "stop"
        ? stopOverlayOutputLive(overlayOutput.id)
        : showOverlayPreviewOnLive(overlayOutput.id)
    void operation
      .catch((error: unknown) => {
        console.error(`[preview] Failed to ${action} graphics`, error)
        toast.error(
          action === "stop"
            ? "Could not stop graphics"
            : "Could not show graphics on Live"
        )
      })
      .finally(() => setOverlayActionPending(false))
  }

  return (
    <div
      data-slot="preview-panel"
      data-preview-mode={isOverlayPreview ? "overlays" : "content"}
      className="flex min-w-0 shrink-0 flex-col gap-3"
    >
      <div className="overflow-hidden rounded-[10px] border border-border bg-card">
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 bg-surface-header px-3">
          <span className="min-w-0 truncate text-xs font-semibold text-foreground">
            Preview
          </span>
          {isOverlayPreview && onPreviewModeChange ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onPreviewModeChange("content")}
            >
              Content Preview
            </Button>
          ) : null}
        </div>
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
              overlays={
                isOverlayPreview
                  ? overlayPreviewPayload
                  : // Graphics show only over live video, on air and here.
                    programHidesGraphics(previewVerse)
                    ? null
                    : overlayPreviewPayload
                      ? overlayPreviewPayload
                      : isProgramLive
                        ? getOverlayPayloadForOutput(
                            overlayConfig,
                            activeOverlays,
                            "main",
                            { verse: previewVerse }
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
      </div>
      <PreviewFooter
        message={
          isOverlayPreview && !overlayOutput
            ? "Add a Video Overlays output in Displays to enable Show on Live."
            : undefined
        }
      >
        {isOverlayPreview ? (
          <>
            {!overlayOutputIsLive || overlayChangesPending ? (
              <LiveActionButton
                action={overlayChangesPending ? "update" : "show"}
                className="flex-1"
                onClick={() => runOverlayLive("show")}
                disabled={
                  !overlayOutput ||
                  isOverlayActionPending ||
                  (overlayPreviewEmpty && !overlayOutputIsLive)
                }
              />
            ) : null}
            {overlayOutputIsLive ? (
              <LiveActionButton
                action={overlayChangesPending ? "stop" : "stop-live"}
                className="flex-1"
                onClick={() => runOverlayLive("stop")}
                disabled={isOverlayActionPending}
              />
            ) : null}
          </>
        ) : (
          <>
            {!previewIsOnAir ? (
              <LiveActionButton
                action="show"
                className="flex-1"
                onClick={sendPreviewLive}
                disabled={isOverlayActionPending || !previewVerse}
              />
            ) : null}
            {isProgramLive ? (
              <LiveActionButton
                action={previewIsOnAir ? "stop-live" : "stop"}
                className="flex-1"
                onClick={() => useBroadcastStore.getState().setLive(false)}
                disabled={isOverlayActionPending}
              />
            ) : null}
          </>
        )}
      </PreviewFooter>
    </div>
  )
}
