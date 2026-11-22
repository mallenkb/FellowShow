import type { OverlayConfiguration } from "@/types"
import type { OverlayPadKind } from "./overlay-kind-styles"
import { useBroadcastStore } from "@/stores"

const SPEED_LABELS = {
  slow: "Slow scroll",
  standard: "Normal scroll",
  fast: "Fast scroll",
} as const

export interface OverlayPad {
  key: string
  kind: OverlayPadKind
  id: string
  name: string
  kindLabel: string
  detail: string
  /** Logo images shown as small thumbnails on the pad. */
  imageUrls?: string[]
  /** Sent from Sermon, Notes or Songs. */
  sent?: boolean
}

export function buildPads(config: OverlayConfiguration): OverlayPad[] {
  const pads: OverlayPad[] = []
  if (config.logo.logos.length > 0) {
    pads.push({
      key: "logo",
      kind: "logo",
      id: "logo",
      name:
        config.logo.logos.length === 1
          ? config.logo.logos[0].name
          : `${config.logo.logos.length} logos`,
      kindLabel: "Logo",
      detail: "Stays on screen",
      imageUrls: config.logo.logos.slice(0, 3).map((logo) => logo.imageUrl),
    })
  }
  for (const bar of config.bars) {
    pads.push({
      key: `bar:${bar.id}`,
      kind: "bar",
      id: bar.id,
      name: bar.name,
      kindLabel: bar.source === "text" ? "Text bar" : "Scripture bar",
      sent: bar.sent,
      detail:
        bar.source === "live-verse" ? "Follows the verse" : "Stays on screen",
    })
  }
  for (const preset of config.lowerThirdPresets) {
    pads.push({
      key: `lower:${preset.id}`,
      kind: "lowerThird",
      id: preset.id,
      name: preset.name,
      kindLabel: "Lower third",
      detail: `Hides after ${Math.round(preset.durationMs / 1000)}s`,
    })
  }
  for (const message of config.tickerMessages) {
    pads.push({
      key: `ticker:${message.id}`,
      kind: "ticker",
      id: message.id,
      name: message.text,
      kindLabel: "Scrolling text",
      sent: message.sent,
      detail: SPEED_LABELS[message.speed ?? config.ticker.speed],
    })
  }
  const ranks = new Map(config.padOrder?.map((key, index) => [key, index]))
  pads.sort(
    (a, b) => (ranks.get(a.key) ?? Infinity) - (ranks.get(b.key) ?? Infinity)
  )
  // Shortcuts follow the two grids in reading order.
  return [...pads.filter((pad) => !pad.sent), ...pads.filter((pad) => pad.sent)]
}

export function moveOverlayPad(sourceKey: string, targetKey: string): void {
  if (sourceKey === targetKey) return
  useBroadcastStore.setState((state) => {
    const pads = buildPads(state.overlayConfig)
    const source = pads.find((pad) => pad.key === sourceKey)
    const target = pads.find((pad) => pad.key === targetKey)
    if (!source || !target || Boolean(source.sent) !== Boolean(target.sent))
      return state
    const order = pads.map((pad) => pad.key)
    const targetIndex = order.indexOf(targetKey)
    order.splice(order.indexOf(sourceKey), 1)
    order.splice(targetIndex, 0, sourceKey)
    return { overlayConfig: { ...state.overlayConfig, padOrder: order } }
  })
}
