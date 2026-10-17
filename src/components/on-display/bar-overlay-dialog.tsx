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
import {
  DEFAULT_BAR_APPEARANCE,
  getBarPreviewPayload,
  getCurrentOverlayScripture,
} from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"
import type { BarAppearance, BarOverlayItem } from "@/types"
import { BarAppearanceFields } from "./bar-appearance-fields"
import { BarContentFields, type BarContentDraft } from "./bar-content-fields"
import { DeleteGraphicButton } from "./delete-graphic-button"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlayDesignPreview } from "./overlay-design-preview"

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
    design: source.design,
    accentColor: source.accentColor,
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
      showBadge: false,
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

/** Bars are named after what they say, so the pad always matches. */
function defaultName(draft: BarDraft): string {
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
          ? "Insert a verse or type its words."
          : "Type the words people should see."
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
          <DialogDescription className="sr-only">
            Write the bar, pick a design, then save it to Preview.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border border-border">
          <OverlayDesignPreview overlays={preview} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid content-start gap-3">
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
          <BarAppearanceFields
            value={draft}
            content={{
              heading: draft.heading,
              badge: draft.showBadge ? draft.badge : "",
              text: draft.text,
            }}
            onChange={(appearance) => setDraft({ ...draft, ...appearance })}
          />
        </div>
        <DialogFooter className="items-center sm:justify-between">
          {barId ? (
            <DeleteGraphicButton
              name={bar?.name ?? "this bar"}
              onDelete={remove}
            />
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
