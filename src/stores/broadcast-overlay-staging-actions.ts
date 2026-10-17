import {
  createInactiveOverlayState,
  isFullWidthLowerThird,
  overlaySelectionFromLook,
  resolveOverlaySelection,
  sanitizeBarAppearance,
  sanitizeOverlayConfiguration,
} from "@/lib/overlays"
import type { ActiveOverlayState, OverlayConfiguration } from "@/types"
import type {
  BroadcastGet,
  BroadcastSet,
  OverlayStagingActions,
} from "./broadcast-store-types"

/**
 * Video Overlays work like Program: pads and Looks build a selection in
 * Preview, and Show on Live copies that selection to the live graphics.
 */
export function createOverlayStagingActions(
  set: BroadcastSet,
  get: BroadcastGet
): OverlayStagingActions {
  const updateStaged = (
    recipe: (
      staged: ActiveOverlayState,
      config: OverlayConfiguration
    ) => ActiveOverlayState
  ) => {
    set((s) => ({
      stagedOverlays: resolveOverlaySelection(
        s.overlayConfig,
        recipe(s.stagedOverlays, s.overlayConfig)
      ),
    }))
  }

  return {
    stageOverlayLook: (id) => {
      const { overlayConfig } = get()
      const look = overlayConfig.looks.find((item) => item.id === id)
      if (!look) return
      set({ stagedOverlays: overlaySelectionFromLook(overlayConfig, look) })
    },
    toggleStagedLogos: () => {
      updateStaged((staged) => ({
        ...staged,
        logoVisible: !staged.logoVisible,
      }))
    },
    toggleStagedLowerThird: (id) => {
      updateStaged((staged, config) => {
        if (staged.lowerThird?.preset.id === id) {
          return { ...staged, lowerThird: null }
        }
        const preset = config.lowerThirdPresets.find((item) => item.id === id)
        if (!preset) return staged
        // A bar fills the bottom of the screen, so a lower third replaces it.
        // A full-width lower third also replaces scrolling text.
        const banner = isFullWidthLowerThird(preset)
        return {
          ...staged,
          lowerThird: { preset, startedAt: Date.now() },
          barId: null,
          barStartedAt: null,
          ...(banner ? { tickerMessageId: null, tickerStartedAt: null } : {}),
        }
      })
    },
    toggleStagedTicker: (id) => {
      updateStaged((staged) => {
        if (staged.tickerMessageId === id) {
          return { ...staged, tickerMessageId: null, tickerStartedAt: null }
        }
        return {
          ...staged,
          tickerMessageId: id,
          tickerStartedAt: Date.now(),
          barId: null,
          barStartedAt: null,
          lowerThird: isFullWidthLowerThird(staged.lowerThird?.preset)
            ? null
            : staged.lowerThird,
        }
      })
    },
    toggleStagedBar: (id) => {
      updateStaged((staged) => {
        if (staged.barId === id) {
          return { ...staged, barId: null, barStartedAt: null }
        }
        return {
          ...staged,
          barId: id,
          barStartedAt: Date.now(),
          lowerThird: null,
          tickerMessageId: null,
          tickerStartedAt: null,
        }
      })
    },
    clearStagedOverlays: () => {
      set({ stagedOverlays: createInactiveOverlayState() })
    },
    commitStagedOverlays: () => {
      const state = get()
      const staged = resolveOverlaySelection(
        state.overlayConfig,
        state.stagedOverlays
      )
      const active = state.activeOverlays
      // Remove first so a bar never briefly shares the screen.
      if (!staged.barId && active.barId) state.clearBarOverlay()
      if (!staged.lowerThird && active.lowerThird) {
        state.clearLowerThirdOverlay()
      }
      if (!staged.tickerMessageId && active.tickerMessageId) {
        state.stopTickerMessage()
      }
      if (staged.logoVisible !== active.logoVisible) {
        state.setLogoOverlayVisible(staged.logoVisible)
      }
      if (staged.barId && staged.barId !== active.barId) {
        state.showBarOverlay(staged.barId)
      }
      const presetId = staged.lowerThird?.preset.id
      if (presetId && presetId !== get().activeOverlays.lowerThird?.preset.id) {
        state.showLowerThirdOverlay(presetId)
      }
      if (
        staged.tickerMessageId &&
        staged.tickerMessageId !== get().activeOverlays.tickerMessageId
      ) {
        state.showTickerMessage(staged.tickerMessageId)
      }
    },
    showBarOverlay: (id) => {
      if (!get().overlayConfig.bars.some((bar) => bar.id === id)) return
      if (get().activeOverlays.lowerThird) get().clearLowerThirdOverlay()
      if (get().activeOverlays.tickerMessageId) get().stopTickerMessage()
      const startedAt = Date.now()
      set((s) => ({
        activeOverlays: {
          ...s.activeOverlays,
          barId: id,
          barStartedAt: startedAt,
        },
        stagedOverlays: {
          ...s.stagedOverlays,
          barId: id,
          barStartedAt: startedAt,
          lowerThird: null,
          tickerMessageId: null,
          tickerStartedAt: null,
        },
      }))
      get().syncBroadcastOutput()
    },
    clearBarOverlay: () => {
      set((s) => ({
        activeOverlays: {
          ...s.activeOverlays,
          barId: null,
          barStartedAt: null,
        },
      }))
      get().syncBroadcastOutput()
    },
    saveBarOverlay: (bar) => {
      const now = Date.now()
      const id = bar.id?.trim() || crypto.randomUUID()
      set((s) => {
        const existing = s.overlayConfig.bars.find((item) => item.id === id)
        return {
          overlayConfig: sanitizeOverlayConfiguration(
            {
              ...s.overlayConfig,
              bars: [
                ...s.overlayConfig.bars.filter((item) => item.id !== id),
                {
                  ...bar,
                  id,
                  targetOutputIds:
                    bar.targetOutputIds ?? existing?.targetOutputIds,
                  createdAt: existing?.createdAt ?? now,
                  updatedAt: now,
                },
              ],
            },
            s.outputs.map((output) => output.id)
          ),
        }
      })
      get().syncBroadcastOutput()
      return id
    },
    deleteBarOverlay: (id) => {
      set((s) => ({
        overlayConfig: {
          ...s.overlayConfig,
          bars: s.overlayConfig.bars.filter((bar) => bar.id !== id),
          looks: s.overlayConfig.looks.map((look) =>
            look.barId === id ? { ...look, barId: null } : look
          ),
        },
        activeOverlays:
          s.activeOverlays.barId === id
            ? { ...s.activeOverlays, barId: null, barStartedAt: null }
            : s.activeOverlays,
        stagedOverlays:
          s.stagedOverlays.barId === id
            ? { ...s.stagedOverlays, barId: null, barStartedAt: null }
            : s.stagedOverlays,
      }))
      get().syncBroadcastOutput()
    },
    applyBarAppearanceToAll: (appearance) => {
      const sanitized = sanitizeBarAppearance(appearance)
      set((s) => ({
        overlayConfig: {
          ...s.overlayConfig,
          bars: s.overlayConfig.bars.map((bar) => {
            const next = { ...bar, ...sanitized, updatedAt: Date.now() }
            // Drop the old image when the new appearance has none.
            if (!sanitized.backgroundImageUrl) delete next.backgroundImageUrl
            return next
          }),
        },
      }))
      get().syncBroadcastOutput()
    },
    saveOverlayLook: (look) => {
      const id = look.id?.trim() || crypto.randomUUID()
      set((s) => ({
        overlayConfig: sanitizeOverlayConfiguration(
          {
            ...s.overlayConfig,
            looks: s.overlayConfig.looks.some((item) => item.id === id)
              ? s.overlayConfig.looks.map((item) =>
                  item.id === id ? { ...look, id } : item
                )
              : [...s.overlayConfig.looks, { ...look, id }],
          },
          s.outputs.map((output) => output.id)
        ),
      }))
      return id
    },
    deleteOverlayLook: (id) => {
      set((s) => ({
        overlayConfig: {
          ...s.overlayConfig,
          looks: s.overlayConfig.looks.filter((look) => look.id !== id),
        },
      }))
    },
  }
}
