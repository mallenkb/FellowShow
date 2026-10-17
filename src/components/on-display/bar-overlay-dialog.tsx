import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_BAR_APPEARANCE,
  getBarPreviewPayload,
  getCurrentOverlayScripture,
} from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"
import type { BarAppearance, BarOverlayItem } from "@/types"
import { BarAppearanceFields } from "./bar-appearance-fields"
import { BarContentFields, type BarContentDraft } from "./bar-content-fields"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlayVideoCanvas } from "./overlay-video-canvas"

interface BarDraft extends BarContentDraft, BarAppearance {
  name: string
  targetOutputIds: string[]
}

function appearanceOf(source: BarAppearance): BarAppearance {
  return {
    backgroundType: source.backgroundType,
    backgroundColor: source.backgroundColor,
    backgroundColorEnd: source.backgroundColorEnd,
    backgroundImageUrl: source.backgroundImageUrl,
    backgroundDimPercent: source.backgroundDimPercent,
    textColor: source.textColor,
    padding: source.padding,
  }
}

function draftFrom(
  bar: BarOverlayItem | undefined,
  fallbackAppearance: BarAppearance,
  defaultTargets: string[]
): BarDraft {
  if (!bar) {
    return {
      ...appearanceOf(fallbackAppearance),
      name: "",
      source: "text",
      heading: "",
      badge: "",
      text: "",
      showBadge: true,
      targetOutputIds: defaultTargets,
    }
  }
  return {
    ...appearanceOf(bar),
    name: bar.name,
    source: bar.source,
    heading: bar.heading,
    badge: bar.badge ?? "",
    text: bar.text,
    showBadge: bar.showBadge,
    targetOutputIds: bar.targetOutputIds,
  }
}

function defaultName(draft: BarDraft): string {
  if (draft.name.trim()) return draft.name.trim()
  if (draft.source === "live-verse") return "Scripture bar"
  return draft.heading.trim() || draft.text.trim().slice(0, 28) || "Bar"
}

/**
 * Creates or edits a bar. Mount it with a key per bar so each opening starts
 * from that bar's saved values.
 */
export function BarOverlayDialog({
  barId,
  open,
  onOpenChange,
}: {
  barId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const bar = useBroadcastStore((state) =>
    state.overlayConfig.bars.find((item) => item.id === barId)
  )
  // New bars start from the look of the first saved bar.
  const firstBar = useBroadcastStore((state) => state.overlayConfig.bars[0])
  // New bars show on every output until the operator narrows them down.
  const outputs = useBroadcastStore((state) => state.outputs)
  const defaultTargets = outputs.map((output) => output.id)
  const isLive = useBroadcastStore((state) => state.isLive)
  const liveVerse = useBroadcastStore((state) => state.liveVerse)
  const previewVerse = useBroadcastStore((state) => state.previewVerse)
  const [draft, setDraft] = useState<BarDraft>(() =>
    draftFrom(bar, firstBar ?? DEFAULT_BAR_APPEARANCE, defaultTargets)
  )
  const [startedAt] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)

  const fields = {
    ...draft,
    name: defaultName(draft),
    heading: draft.heading.trim(),
    text: draft.source === "live-verse" ? "" : draft.text.trim(),
    badge: draft.badge.trim() || undefined,
  }
  const candidate: BarOverlayItem = {
    ...fields,
    id: barId ?? "draft",
    createdAt: startedAt,
    updatedAt: startedAt,
  }
  const preview = getBarPreviewPayload(
    candidate,
    getCurrentOverlayScripture({ isLive, liveVerse, previewVerse }),
    startedAt
  )

  const save = () => {
    if (draft.source !== "live-verse" && !draft.text.trim()) {
      setError(
        draft.source === "verse"
          ? "Choose a verse or type the verse text."
          : "Type the words you want people to see."
      )
      return
    }
    const store = useBroadcastStore.getState()
    const id = store.saveBarOverlay({ ...fields, id: barId ?? undefined })
    if (store.stagedOverlays.barId !== id) store.toggleStagedBar(id)
    onOpenChange(false)
  }

  const remove = () => {
    if (!barId) return
    useBroadcastStore.getState().deleteBarOverlay(barId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{barId ? "Edit bar" : "Add bar"}</DialogTitle>
          <DialogDescription>
            A bar runs along the bottom of the screen and shows on its own,
            without a lower third or scrolling text. Saving puts it in Preview.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="grid content-start gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Bar name
              <Input
                value={draft.name}
                maxLength={40}
                placeholder={defaultName({ ...draft, name: "" })}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <BarContentFields
              value={draft}
              onChange={(content) => {
                setError(null)
                setDraft({ ...draft, ...content })
              }}
            />
            <div className="flex items-center justify-between gap-3 text-xs font-medium">
              Show on
              <OutputTargetSelector
                value={draft.targetOutputIds}
                onChange={(targetOutputIds) =>
                  setDraft({ ...draft, targetOutputIds })
                }
              />
            </div>
            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="grid content-start gap-3">
            <OverlayVideoCanvas overlays={preview} />
            <h3 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Appearance
            </h3>
            <BarAppearanceFields
              value={draft}
              onChange={(appearance) => setDraft({ ...draft, ...appearance })}
            />
          </div>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          {barId ? (
            <Button type="button" variant="ghost" onClick={remove}>
              Delete bar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save to Preview
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
