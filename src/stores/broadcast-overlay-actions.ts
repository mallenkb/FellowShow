import {
  clampLowerThirdDuration,
  sanitizeOverlayConfiguration,
} from "@/lib/overlays"
import type {
  ActiveOverlayState,
  LowerThirdPreset,
  TickerMessage,
} from "@/types"
import type {
  BroadcastGet,
  BroadcastSet,
  OverlayActions,
} from "./broadcast-store-types"

let lowerThirdExpiryTimer: ReturnType<typeof setTimeout> | null = null
let suspendedFullWidthTicker: {
  id: string
  startedAt: number | null
} | null = null

function isFullWidthLowerThird(preset: LowerThirdPreset | undefined): boolean {
  return preset?.style === "full-width-banner"
}

function restoreSuspendedTicker(
  active: ActiveOverlayState,
  messages: readonly TickerMessage[]
): ActiveOverlayState {
  const suspended = suspendedFullWidthTicker
  suspendedFullWidthTicker = null
  if (!suspended || !messages.some((message) => message.id === suspended.id)) {
    return active
  }
  return {
    ...active,
    tickerMessageId: suspended.id,
    tickerStartedAt: suspended.startedAt ?? Date.now(),
  }
}

export function createOverlayActions(
  set: BroadcastSet,
  get: BroadcastGet
): OverlayActions {
  return {
    addLogoOverlays: (logos) => {
      set((s) => ({
        overlayConfig: sanitizeOverlayConfiguration(
          {
            ...s.overlayConfig,
            logo: { logos: [...s.overlayConfig.logo.logos, ...logos] },
          },
          s.outputs.map((output) => output.id)
        ),
      }))
      get().syncBroadcastOutput()
    },
    updateLogoOverlay: (id, updates) => {
      set((s) => ({
        overlayConfig: sanitizeOverlayConfiguration(
          {
            ...s.overlayConfig,
            logo: {
              logos: s.overlayConfig.logo.logos.map((logo) =>
                logo.id === id ? { ...logo, ...updates } : logo
              ),
            },
          },
          s.outputs.map((output) => output.id)
        ),
      }))
      get().syncBroadcastOutput()
    },
    removeLogoOverlay: (id) => {
      set((s) => ({
        overlayConfig: {
          ...s.overlayConfig,
          logo: {
            logos: s.overlayConfig.logo.logos.filter((logo) => logo.id !== id),
          },
        },
      }))
      get().syncBroadcastOutput()
    },
    updateTickerOverlay: (updates) => {
      set((s) => ({
        overlayConfig: sanitizeOverlayConfiguration(
          {
            ...s.overlayConfig,
            ticker: { ...s.overlayConfig.ticker, ...updates },
          },
          s.outputs.map((output) => output.id)
        ),
      }))
      get().syncBroadcastOutput()
    },
    setLogoOverlayVisible: (logoVisible) => {
      set((s) => ({
        activeOverlays: { ...s.activeOverlays, logoVisible },
      }))
      get().syncBroadcastOutput()
    },
    saveTickerMessage: (message) => {
      const now = Date.now()
      const id = message.id?.trim() || crypto.randomUUID()
      set((s) => {
        const existing = s.overlayConfig.tickerMessages.find(
          (item) => item.id === id
        )
        return {
          overlayConfig: sanitizeOverlayConfiguration(
            {
              ...s.overlayConfig,
              tickerMessages: [
                ...s.overlayConfig.tickerMessages.filter(
                  (item) => item.id !== id
                ),
                {
                  ...message,
                  id,
                  speed: message.speed ?? s.overlayConfig.ticker.speed,
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
    deleteTickerMessage: (id) => {
      if (suspendedFullWidthTicker?.id === id) {
        suspendedFullWidthTicker = null
      }
      set((s) => ({
        overlayConfig: {
          ...s.overlayConfig,
          tickerMessages: s.overlayConfig.tickerMessages.filter(
            (message) => message.id !== id
          ),
        },
        activeOverlays:
          s.activeOverlays.tickerMessageId === id
            ? {
                ...s.activeOverlays,
                tickerMessageId: null,
                tickerStartedAt: null,
              }
            : s.activeOverlays,
      }))
      get().syncBroadcastOutput()
    },
    showTickerMessage: (id) => {
      if (!get().overlayConfig.tickerMessages.some((item) => item.id === id)) {
        return
      }
      const currentLowerThird = get().activeOverlays.lowerThird
      if (isFullWidthLowerThird(currentLowerThird?.preset)) {
        suspendedFullWidthTicker = { id, startedAt: Date.now() }
        return
      }
      set((s) => ({
        activeOverlays: {
          ...s.activeOverlays,
          tickerMessageId: id,
          tickerStartedAt: Date.now(),
        },
      }))
      get().syncBroadcastOutput()
    },
    stopTickerMessage: () => {
      suspendedFullWidthTicker = null
      set((s) => ({
        activeOverlays: {
          ...s.activeOverlays,
          tickerMessageId: null,
          tickerStartedAt: null,
        },
      }))
      get().syncBroadcastOutput()
    },
    saveLowerThirdPreset: (preset) => {
      const now = Date.now()
      const id = preset.id?.trim() || crypto.randomUUID()
      set((s) => {
        const existing = s.overlayConfig.lowerThirdPresets.find(
          (item) => item.id === id
        )
        const overlayConfig = sanitizeOverlayConfiguration(
          {
            ...s.overlayConfig,
            lowerThirdPresets: [
              ...s.overlayConfig.lowerThirdPresets.filter(
                (item) => item.id !== id
              ),
              {
                ...preset,
                durationMs: clampLowerThirdDuration(preset.durationMs),
                id,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
              },
            ],
          },
          s.outputs.map((output) => output.id)
        )
        const savedPreset = overlayConfig.lowerThirdPresets.find(
          (item) => item.id === id
        )
        const activeLowerThird = s.activeOverlays.lowerThird
        let activeOverlays = s.activeOverlays
        if (savedPreset && activeLowerThird?.preset.id === id) {
          const wasFullWidth = isFullWidthLowerThird(activeLowerThird.preset)
          const isNowFullWidth = isFullWidthLowerThird(savedPreset)
          activeOverlays = {
            ...activeOverlays,
            lowerThird: { ...activeLowerThird, preset: savedPreset },
          }
          if (isNowFullWidth) {
            if (!suspendedFullWidthTicker && activeOverlays.tickerMessageId) {
              suspendedFullWidthTicker = {
                id: activeOverlays.tickerMessageId,
                startedAt: activeOverlays.tickerStartedAt,
              }
            }
            activeOverlays = {
              ...activeOverlays,
              tickerMessageId: null,
              tickerStartedAt: null,
            }
          } else if (wasFullWidth) {
            activeOverlays = restoreSuspendedTicker(
              activeOverlays,
              s.overlayConfig.tickerMessages
            )
          }
        }
        return {
          overlayConfig,
          activeOverlays,
        }
      })
      get().syncBroadcastOutput()
      return id
    },
    saveLowerThirdAppearance: (appearance) => {
      set((s) => ({
        overlayConfig: sanitizeOverlayConfiguration(
          {
            ...s.overlayConfig,
            lastLowerThirdAppearance: appearance,
          },
          s.outputs.map((output) => output.id)
        ),
      }))
    },
    deleteLowerThirdPreset: (id) => {
      const activeLowerThird = get().activeOverlays.lowerThird
      const deletingActive = activeLowerThird?.preset.id === id
      const deletingFullWidth = isFullWidthLowerThird(activeLowerThird?.preset)
      if (deletingActive && lowerThirdExpiryTimer) {
        clearTimeout(lowerThirdExpiryTimer)
        lowerThirdExpiryTimer = null
      }
      set((s) => {
        const activeOverlays = deletingActive
          ? { ...s.activeOverlays, lowerThird: null }
          : s.activeOverlays
        return {
          overlayConfig: {
            ...s.overlayConfig,
            lowerThirdPresets: s.overlayConfig.lowerThirdPresets.filter(
              (preset) => preset.id !== id
            ),
          },
          activeOverlays:
            deletingActive && deletingFullWidth
              ? restoreSuspendedTicker(
                  activeOverlays,
                  s.overlayConfig.tickerMessages
                )
              : activeOverlays,
        }
      })
      get().syncBroadcastOutput()
    },
    showLowerThirdOverlay: (id) => {
      const preset = get().overlayConfig.lowerThirdPresets.find(
        (item) => item.id === id
      )
      if (!preset) return
      const startedAt = Date.now()
      const previousLowerThird = get().activeOverlays.lowerThird
      const previousWasFullWidth = isFullWidthLowerThird(
        previousLowerThird?.preset
      )
      const nextIsFullWidth = isFullWidthLowerThird(preset)
      if (lowerThirdExpiryTimer) clearTimeout(lowerThirdExpiryTimer)
      set((s) => {
        if (
          nextIsFullWidth &&
          !suspendedFullWidthTicker &&
          s.activeOverlays.tickerMessageId
        ) {
          suspendedFullWidthTicker = {
            id: s.activeOverlays.tickerMessageId,
            startedAt: s.activeOverlays.tickerStartedAt,
          }
        }
        let activeOverlays: ActiveOverlayState = {
          ...s.activeOverlays,
          lowerThird: { preset, startedAt },
        }
        if (nextIsFullWidth) {
          activeOverlays = {
            ...activeOverlays,
            tickerMessageId: null,
            tickerStartedAt: null,
          }
        } else if (previousWasFullWidth) {
          activeOverlays = restoreSuspendedTicker(
            activeOverlays,
            s.overlayConfig.tickerMessages
          )
        }
        return { activeOverlays }
      })
      get().syncBroadcastOutput()
      lowerThirdExpiryTimer = setTimeout(() => {
        lowerThirdExpiryTimer = null
        const current = get().activeOverlays.lowerThird
        if (!current || current.startedAt !== startedAt) return
        const currentWasFullWidth = isFullWidthLowerThird(current.preset)
        set((s) => {
          const activeOverlays = { ...s.activeOverlays, lowerThird: null }
          return {
            activeOverlays: currentWasFullWidth
              ? restoreSuspendedTicker(
                  activeOverlays,
                  s.overlayConfig.tickerMessages
                )
              : activeOverlays,
          }
        })
        get().syncBroadcastOutput()
      }, preset.durationMs)
    },
    clearLowerThirdOverlay: () => {
      const currentWasFullWidth = isFullWidthLowerThird(
        get().activeOverlays.lowerThird?.preset
      )
      if (lowerThirdExpiryTimer) {
        clearTimeout(lowerThirdExpiryTimer)
        lowerThirdExpiryTimer = null
      }
      set((s) => {
        const activeOverlays = { ...s.activeOverlays, lowerThird: null }
        return {
          activeOverlays: currentWasFullWidth
            ? restoreSuspendedTicker(
                activeOverlays,
                s.overlayConfig.tickerMessages
              )
            : activeOverlays,
        }
      })
      get().syncBroadcastOutput()
    },
  }
}
