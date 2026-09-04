import { emitTo } from "@tauri-apps/api/event"
import {
  DEFAULT_ANNOUNCEMENT_THEME_ID,
  DEFAULT_SONG_THEME_ID,
} from "@/lib/builtin-themes"
import {
  DEFAULT_OVERLAY_OUTPUT_MODE,
  getOverlayOutputMode,
  getOutputProgramPayload,
  getSectionThemeId,
  inferThemeSection,
  isOverlayOutputMode,
  resolveOutputThemeId,
  windowLabelForOutput,
  type BroadcastOutputConfig,
} from "@/lib/broadcast-outputs"
import {
  getOverlayPayloadForOutput,
  getOverlayPreviewPayload,
} from "@/lib/overlays"
import type {
  BroadcastTheme,
  BroadcastThemeSection,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types"
import type { BroadcastState } from "./broadcast-store-types"

export const DEFAULT_BROADCAST_THEME_ID = "builtin-bible-verse-preview"

export const DEFAULT_SECTION_THEME_IDS: Record<BroadcastThemeSection, string> =
  {
    bible: DEFAULT_BROADCAST_THEME_ID,
    songs: DEFAULT_SONG_THEME_ID,
    announcements: DEFAULT_ANNOUNCEMENT_THEME_ID,
    presentation: DEFAULT_BROADCAST_THEME_ID,
  }

export function isSelectableTheme(theme: BroadcastTheme): boolean {
  return theme.outputMode !== "lower-third" && theme.outputMode !== "ticker"
}

export function withThemePlaybackClock(theme: BroadcastTheme): BroadcastTheme {
  const image = theme.background.image
  if (
    theme.background.type !== "image" ||
    image?.mediaType !== "video" ||
    image.playbackStartedAt !== undefined
  ) {
    return theme
  }
  return {
    ...theme,
    background: {
      ...theme.background,
      image: { ...image, playbackStartedAt: Date.now() },
    },
  }
}

export function sanitizeSectionThemeIds(
  value: unknown
): Partial<Record<BroadcastThemeSection, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const sectionThemeIds = value as Record<string, unknown>
  const stringValue = (key: string): string | undefined => {
    const candidate = sectionThemeIds[key]
    return typeof candidate === "string" ? candidate : undefined
  }
  return {
    bible: stringValue("bible"),
    songs: stringValue("songs"),
    announcements: stringValue("announcements"),
    presentation: stringValue("presentation"),
  }
}

export function isThemeDirty(
  draft: BroadcastTheme | null,
  baseline: BroadcastTheme | null
): boolean {
  if (!draft || !baseline) return false
  return JSON.stringify(draft) !== JSON.stringify(baseline)
}

export function selectOverlayOutputId(
  currentId: string | null,
  outputs: BroadcastOutputConfig[]
): string | null {
  if (
    currentId &&
    outputs.some(
      (output) => output.id === currentId && output.content === "overlays"
    )
  ) {
    return currentId
  }
  return outputs.find((output) => output.content === "overlays")?.id ?? null
}

export function normalizeLiveOverlayOutputIds(
  outputIds: readonly string[],
  outputs: readonly BroadcastOutputConfig[]
): string[] {
  const overlayOutputIds = new Set(
    outputs
      .filter((output) => output.content === "overlays")
      .map((output) => output.id)
  )
  return outputIds.filter((outputId) => overlayOutputIds.has(outputId))
}

export function normalizeOutputUpdate(
  output: BroadcastOutputConfig,
  updates: Partial<Omit<BroadcastOutputConfig, "id">>
): BroadcastOutputConfig {
  const next = { ...output, ...updates }
  if (next.content !== "overlays") {
    const normalOutput = { ...next }
    delete normalOutput.overlayMode
    return normalOutput
  }
  return {
    ...next,
    overlayMode: isOverlayOutputMode(next.overlayMode)
      ? next.overlayMode
      : DEFAULT_OVERLAY_OUTPUT_MODE,
  }
}

export function getOutputOverlayPayload(
  state: BroadcastState,
  output: BroadcastOutputConfig,
  verse: VerseRenderData | null,
  timer: PresenterTimerRenderData | null
): ReturnType<typeof getOverlayPayloadForOutput> | null {
  // Normal outputs follow the global Program on-air state. Graphics outputs
  // have their own explicit Show on Live state so they can go on air without
  // sending their master overlays into the staged Program preview.
  if (
    output.content === "overlays"
      ? !state.liveOverlayOutputIds.includes(output.id)
      : !state.isLive
  ) {
    return null
  }
  // Video Overlays is the master graphics bus: its preview and live output
  // intentionally share the same all-active overlay payload. Per-output
  // targeting remains in effect for normal program outputs.
  return output.content === "overlays"
    ? getOverlayPreviewPayload(state.overlayConfig, state.activeOverlays)
    : getOverlayPayloadForOutput(
        state.overlayConfig,
        state.activeOverlays,
        output.id,
        { verse, timer }
      )
}

export function emitDraftToBroadcast(state: BroadcastState): void {
  if (!state.draftTheme || !state.editingThemeId) return
  // Live-preview the draft on every output currently rendering this theme.
  for (const output of state.outputs) {
    const effectiveThemeId = resolveOutputThemeId(
      output,
      state,
      state.liveVerse,
      state.selectedThemeSection
    )
    if (effectiveThemeId !== state.editingThemeId) continue
    const { verse, timer } = getOutputProgramPayload(
      output.content,
      state.isLive,
      state.liveVerse,
      state.presenterTimer
    )
    void emitTo(windowLabelForOutput(output.id), "broadcast:verse-update", {
      theme: state.draftTheme,
      verse,
      timer,
      lowerThird:
        output.content === "everything" && state.isLive
          ? state.lowerThird
          : null,
      overlays: getOutputOverlayPayload(state, output, verse, timer),
      opacity: state.outputOpacity,
      ...(getOverlayOutputMode(output)
        ? { overlayMode: getOverlayOutputMode(output) }
        : {}),
    }).catch(() => {})
  }
}

type ProgramThemeState = Pick<
  BroadcastState,
  "activeThemeId" | "sectionThemeIds" | "themes"
>

export function hasProgramContent(
  verse: VerseRenderData | null,
  timer: PresenterTimerRenderData | null
): boolean {
  return Boolean(verse || timer)
}

function verseRenderKey(verse: VerseRenderData | null): string {
  if (!verse) return "null"
  return JSON.stringify({
    sourceId: verse.sourceId ?? null,
    reference: verse.reference,
    themeSection: verse.themeSection ?? null,
    referenceMode: verse.referenceMode ?? null,
    segments: verse.segments,
    announcement: verse.announcement ?? null,
    announcementSetName: verse.announcementSetName ?? null,
    presentationImage: verse.presentationImage ?? null,
    tickerText: verse.tickerText ?? null,
  })
}

export function withPresentationPlaybackClock(
  verse: VerseRenderData | null,
  previousVerse: VerseRenderData | null
): VerseRenderData | null {
  const image = verse?.presentationImage
  if (!image || image.mediaType !== "video") return verse

  const previousImage = previousVerse?.presentationImage
  const playbackStartedAt =
    image.playbackStartedAt ??
    (previousImage?.url === image.url
      ? previousImage.playbackStartedAt
      : undefined) ??
    Date.now()

  if (image.playbackStartedAt === playbackStartedAt) return verse
  return {
    ...verse,
    presentationImage: { ...image, playbackStartedAt },
  }
}

function timerRenderKey(timer: PresenterTimerRenderData | null): string {
  if (!timer) return "null"
  return JSON.stringify({
    remainingSeconds: timer.remainingSeconds,
    totalSeconds: timer.totalSeconds,
    isRunning: timer.isRunning,
    isFinished: timer.isFinished,
    fontFamily: timer.fontFamily,
    backgroundUrl: timer.backgroundUrl ?? null,
    backgroundMediaType: timer.backgroundMediaType ?? null,
    backgroundPlaybackStartedAt: timer.backgroundPlaybackStartedAt ?? null,
  })
}

export function hasSameProgramPayload(
  currentVerse: VerseRenderData | null,
  currentTimer: PresenterTimerRenderData | null,
  nextVerse: VerseRenderData | null,
  nextTimer: PresenterTimerRenderData | null
): boolean {
  return (
    verseRenderKey(currentVerse) === verseRenderKey(nextVerse) &&
    timerRenderKey(currentTimer) === timerRenderKey(nextTimer)
  )
}

export function getThemeForProgramContent(
  state: ProgramThemeState,
  verse: VerseRenderData | null,
  emptySection: BroadcastThemeSection = "bible"
): BroadcastTheme {
  const section = verse ? inferThemeSection(verse) : emptySection
  const themeId = getSectionThemeId(state, section)
  return state.themes.find((theme) => theme.id === themeId) ?? state.themes[0]
}
