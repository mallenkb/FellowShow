import { emitTo } from "@tauri-apps/api/event"
import { DEFAULT_ANNOUNCEMENT_THEME_ID } from "@/lib/builtin-themes"
import {
  createOutputConfig,
  getOverlayOutputMode,
  getOutputProgramPayload,
  MAX_BROADCAST_OUTPUTS,
  resolveOutputThemeId,
  windowLabelForOutput,
} from "@/lib/broadcast-outputs"
import { sanitizeOverlayConfiguration } from "@/lib/overlays"
import {
  getOutputOverlayPayload,
  hasProgramContent,
  hasSameProgramPayload,
  normalizeLiveOverlayOutputIds,
  normalizeOutputUpdate,
  selectOverlayOutputId,
  withPresentationPlaybackClock,
  withThemePlaybackClock,
} from "./broadcast-store-helpers"
import type {
  BroadcastGet,
  BroadcastSet,
  OutputActions,
} from "./broadcast-store-types"

export function createOutputActions(
  set: BroadcastSet,
  get: BroadcastGet
): OutputActions {
  return {
    syncBroadcastOutputFor: (outputId: string) => {
      const s = get()
      const output = s.outputs.find((o) => o.id === outputId)
      if (!output) return
      // A dedicated song display is an operator confidence surface: it mirrors
      // the staged song verse without taking that verse to the main program.
      const mirrorsSongPreview = output.content === "songs"
      const outputVerse = mirrorsSongPreview ? s.previewVerse : s.liveVerse
      const outputTimer = mirrorsSongPreview ? s.previewTimer : s.presenterTimer
      // Theme follows the staged content even off-air, so the background is
      // already right before going live; program content itself is gated below.
      const themeId = resolveOutputThemeId(
        output,
        s,
        outputVerse,
        s.selectedThemeSection
      )
      const theme = s.themes.find((t) => t.id === themeId) ?? s.themes[0]
      if (!theme) return

      // Outputs only carry program content while live — and only the content
      // routed to them; off-air (or when other content is live) they fall back
      // to the theme background instead of freezing on the last verse.
      const { verse, timer } = getOutputProgramPayload(
        output.content,
        mirrorsSongPreview || s.isLive,
        outputVerse,
        outputTimer
      )
      void emitTo(windowLabelForOutput(output.id), "broadcast:verse-update", {
        theme,
        verse,
        timer,
        lowerThird:
          output.content === "everything" && s.isLive ? s.lowerThird : null,
        overlays: getOutputOverlayPayload(s, output, verse, timer),
        opacity: s.outputOpacity,
        ...(getOverlayOutputMode(output)
          ? { overlayMode: getOverlayOutputMode(output) }
          : {}),
      }).catch(() => {})
    },
    syncBroadcastOutput: () => {
      for (const output of get().outputs) {
        get().syncBroadcastOutputFor(output.id)
      }
    },
    setActiveTheme: (themeId, section) => {
      const targetSection = section ?? get().selectedThemeSection
      const resolvedThemeId =
        targetSection === "announcements"
          ? DEFAULT_ANNOUNCEMENT_THEME_ID
          : themeId
      set((s) => ({
        themes: s.themes.map((theme) =>
          theme.id === resolvedThemeId ? withThemePlaybackClock(theme) : theme
        ),
        activeThemeId:
          targetSection === "bible" ? resolvedThemeId : s.activeThemeId,
        selectedThemeSection: targetSection,
        sectionThemeIds: {
          ...s.sectionThemeIds,
          [targetSection]: resolvedThemeId,
        },
      }))
      // Section themes drive every output without a fixed theme.
      get().syncBroadcastOutput()
    },
    setSelectedThemeSection: (selectedThemeSection) =>
      set({ selectedThemeSection }),
    addOutput: (options) => {
      const s = get()
      if (s.outputs.length >= MAX_BROADCAST_OUTPUTS) return null
      const output = createOutputConfig(s.outputs, options)
      const outputs = [...s.outputs, output]
      set({
        outputs,
        selectedOverlayOutputId: selectOverlayOutputId(
          s.selectedOverlayOutputId,
          outputs
        ),
      })
      return output
    },
    removeOutput: (id) => {
      if (id === "main") return
      set((s) => {
        const outputs = s.outputs.filter((output) => output.id !== id)
        return {
          outputs,
          liveOverlayOutputIds: s.liveOverlayOutputIds.filter(
            (outputId) => outputId !== id
          ),
          selectedOverlayOutputId: selectOverlayOutputId(
            s.selectedOverlayOutputId === id ? null : s.selectedOverlayOutputId,
            outputs
          ),
          overlayConfig: sanitizeOverlayConfiguration(
            s.overlayConfig,
            outputs.map((output) => output.id)
          ),
        }
      })
      get().syncBroadcastOutput()
    },
    reorderOutputs: (orderedIds) => {
      set((state) => {
        const orderById = new Map(orderedIds.map((id, index) => [id, index]))
        return {
          outputs: [...state.outputs].sort(
            (left, right) =>
              (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
              (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER)
          ),
        }
      })
    },
    updateOutput: (id, updates) => {
      const safeUpdates =
        id === "main" && updates.content !== undefined
          ? { ...updates, content: "everything" as const }
          : updates
      set((s) => {
        const outputs = s.outputs.map((output) =>
          output.id === id ? normalizeOutputUpdate(output, safeUpdates) : output
        )
        return {
          outputs,
          liveOverlayOutputIds: normalizeLiveOverlayOutputIds(
            s.liveOverlayOutputIds,
            outputs
          ),
          selectedOverlayOutputId: selectOverlayOutputId(
            s.selectedOverlayOutputId,
            outputs
          ),
        }
      })
      get().syncBroadcastOutputFor(id)
    },
    setPreviewOutput: (previewVerse, previewTimer) => {
      let previewChanged = false
      set((s) => {
        const nextPreviewVerse = withPresentationPlaybackClock(
          previewVerse,
          s.previewVerse
        )
        const samePreview = hasSameProgramPayload(
          s.previewVerse,
          s.previewTimer,
          nextPreviewVerse,
          previewTimer
        )
        if (samePreview) return s
        previewChanged = true
        return { previewVerse: nextPreviewVerse, previewTimer }
      })
      if (previewChanged) {
        for (const output of get().outputs) {
          if (output.content === "songs") {
            get().syncBroadcastOutputFor(output.id)
          }
        }
      }
    },
    setLive: (isLive) => {
      set({
        isLive,
        liveSource: isLive ? "manual" : null,
      })
      get().syncBroadcastOutput()
    },
    presentOnLive: (previewVerse, previewTimer, source = "manual") => {
      const nextVerse = withPresentationPlaybackClock(
        previewVerse,
        get().previewVerse
      )
      set({
        previewVerse: nextVerse,
        previewTimer,
        isLive: true,
        liveVerse: nextVerse,
        presenterTimer: previewTimer,
        liveSource: source,
      })
      get().syncBroadcastOutput()
    },
    showPreviewOnLive: (source = "preview") => {
      set((s) => {
        if (!hasProgramContent(s.previewVerse, s.previewTimer)) {
          return {
            isLive: true,
            liveSource: source,
          }
        }
        return {
          isLive: true,
          liveVerse: s.previewVerse,
          presenterTimer: s.previewTimer,
          liveSource: source,
        }
      })
      get().syncBroadcastOutput()
    },
    takePreviewLive: (source = "manual") => {
      set((s) => ({
        isLive: true,
        liveVerse: s.previewVerse,
        presenterTimer: s.previewTimer,
        liveSource: source,
      }))
      get().syncBroadcastOutput()
    },
    setOverlayOutputLive: (outputId, live) => {
      const output = get().outputs.find(
        (candidate) => candidate.id === outputId
      )
      if (!output || output.content !== "overlays") return
      set((s) => ({
        liveOverlayOutputIds: live
          ? s.liveOverlayOutputIds.includes(outputId)
            ? s.liveOverlayOutputIds
            : [...s.liveOverlayOutputIds, outputId]
          : s.liveOverlayOutputIds.filter((id) => id !== outputId),
      }))
      get().syncBroadcastOutputFor(outputId)
    },
    setLiveVerse: (liveVerse) => {
      set((s) => ({
        liveVerse: withPresentationPlaybackClock(liveVerse, s.liveVerse),
      }))
      get().syncBroadcastOutput()
    },
    setPresenterTimer: (presenterTimer) => {
      set({ presenterTimer })
      get().syncBroadcastOutput()
    },
    setLowerThird: (lowerThird) => {
      set({ lowerThird })
      get().syncBroadcastOutput()
    },
    setOutputOpacity: (outputOpacity) => {
      set({ outputOpacity: Math.min(1, Math.max(0, outputOpacity)) })
      get().syncBroadcastOutput()
    },
    clearLowerThird: () => {
      set({ lowerThird: null })
      get().syncBroadcastOutput()
    },
    setSelectedOverlayOutputId: (outputId) => {
      set((s) => ({
        selectedOverlayOutputId: selectOverlayOutputId(outputId, s.outputs),
      }))
    },
  }
}
