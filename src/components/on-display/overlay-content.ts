import { toast } from "sonner"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
} from "@/lib/overlay-live"
import { getOverlayScripture, sanitizeBarAppearance } from "@/lib/overlays"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"
import { useBroadcastStore } from "@/stores"
import type { BarSource, Verse } from "@/types"

/** What a bar or scrolling text shows: a heading such as a reference, and the words. */
export interface OverlayContent {
  heading: string
  badge?: string
  text: string
  source: Extract<BarSource, "verse" | "text">
}

/** A verse as overlay content, in the given or the active translation. */
export function verseContent(
  verse: Verse,
  translation = activeTranslationAbbreviation()
): OverlayContent | null {
  const scripture = getOverlayScripture(toVerseRenderData(verse, translation))
  if (!scripture) return null
  return {
    heading: scripture.heading,
    badge: scripture.badge,
    text: scripture.segments.map((segment) => segment.text).join(" "),
    source: "verse",
  }
}

/** Sends Video Overlays Preview to the graphics output right away. */
function showPreviewOnLive(what: string): void {
  const state = useBroadcastStore.getState()
  const output = resolveOverlayOutput(
    state.outputs,
    state.selectedOverlayOutputId
  )
  if (!output) {
    toast.error("Add a Video Overlays output in Displays to show it on Live.")
    return
  }
  void showOverlayPreviewOnLive(output.id)
    .then((shown) => {
      if (shown) toast.success(`${what} is live`)
    })
    .catch((error: unknown) => {
      console.error("[overlays] Show on Live failed", error)
    })
}

/** Shows the content in a bar on Live, reusing its bar if one exists. */
export function sendToBar(content: OverlayContent): void {
  const store = useBroadcastStore.getState()
  const existing = store.overlayConfig.bars.find(
    (bar) => bar.source === content.source && bar.heading === content.heading
  )
  // A new bar takes the look of the first saved bar.
  const appearance = sanitizeBarAppearance(
    existing ?? store.overlayConfig.bars[0]
  )
  const id = store.saveBarOverlay({
    ...appearance,
    id: existing?.id,
    name: content.heading,
    source: content.source,
    heading: content.heading,
    badge: content.badge,
    showBadge: Boolean(content.badge),
    text: content.text,
    sent: true,
    targetOutputIds: existing?.targetOutputIds,
  })
  if (useBroadcastStore.getState().stagedOverlays.barId !== id) {
    store.toggleStagedBar(id)
  }
  showPreviewOnLive(`${content.heading} bar`)
}

/** Shows the content as scrolling text on Live, reusing its message if one exists. */
export function sendToScroll(content: OverlayContent): void {
  const store = useBroadcastStore.getState()
  const text = `${content.heading} — ${content.text}`
  const existing = store.overlayConfig.tickerMessages.find(
    (message) => message.text === text
  )
  const id = existing
    ? existing.id
    : store.saveTickerMessage({
        text,
        sent: true,
        targetOutputIds: store.outputs.map((output) => output.id),
      })
  if (useBroadcastStore.getState().stagedOverlays.tickerMessageId !== id) {
    store.toggleStagedTicker(id)
  }
  showPreviewOnLive(`${content.heading} scrolling text`)
}
