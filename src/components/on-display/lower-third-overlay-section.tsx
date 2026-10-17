import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogFooter } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBroadcastStore } from "@/stores"
import {
  DEFAULT_LOWER_THIRD_STYLE,
  LOWER_THIRD_STYLE_OPTIONS,
  getDefaultLowerThirdStyleForTheme,
  type LowerThirdPreset,
  type LowerThirdStyle,
  type LowerThirdTheme,
  type BroadcastOverlayPayload,
} from "@/types/overlays"
import { DeleteGraphicButton } from "./delete-graphic-button"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlayDesignPreview } from "./overlay-design-preview"
import { LowerThirdStylePicker } from "./lower-third-style-picker"
import { LowerThirdAppearanceFields } from "./lower-third-appearance-fields"
import { isLowerThirdDesignStyle } from "@/types/lower-third-designs"

export type LowerThirdDraft = Omit<
  LowerThirdPreset,
  "id" | "createdAt" | "updatedAt"
>

const FIELD_LABELS: Record<
  LowerThirdTheme,
  { title: string; subtitle: string; label: string }
> = {
  preacher: {
    title: "Preacher's name",
    subtitle: "Sermon title",
    label: "Assembly or district",
  },
  speaker: {
    title: "Speaker's name",
    subtitle: "Role or title",
    label: "Event or organization",
  },
  notice: { title: "Notice title", subtitle: "Details", label: "Category" },
}

function initialDraft(id?: string): LowerThirdDraft {
  const state = useBroadcastStore.getState()
  const preset = state.overlayConfig.lowerThirdPresets.find(
    (item) => item.id === id
  )
  if (preset)
    return {
      ...preset,
      style: preset.style ?? getDefaultLowerThirdStyleForTheme(preset.theme),
    }
  const saved = state.overlayConfig.lastLowerThirdAppearance
  const style = saved?.style ?? "clean-white"
  const option =
    LOWER_THIRD_STYLE_OPTIONS.find((item) => item.value === style) ??
    LOWER_THIRD_STYLE_OPTIONS[0]
  return {
    name: "",
    theme: "preacher",
    title: "",
    subtitle: "",
    label: "",
    style,
    backgroundColor: option.defaultBackgroundColor,
    textColor: option.defaultTextColor,
    widthPercent: isLowerThirdDesignStyle(style)
      ? style === "centered"
        ? 80
        : 72
      : 60,
    anchor: isLowerThirdDesignStyle(style)
      ? style === "centered"
        ? "bottom-center"
        : "bottom-left"
      : "center",
    xPercent:
      style === "centered" ? 50 : isLowerThirdDesignStyle(style) ? 5 : 30,
    yPercent:
      style === "centered" ? 91 : isLowerThirdDesignStyle(style) ? 89 : 82,
    durationMs: 14_000,
    maxWidthEnabled: true,
    ...saved,
    targetOutputIds: state.outputs.map((output) => output.id),
  }
}

/** Local draft editor. Choosing a style never changes Preview or Live until saved. */
export function LowerThirdOverlaySection({
  initialEditId,
  onDone,
}: { initialEditId?: string; onDone?: () => void } = {}) {
  const [draft, setDraft] = useState(() => initialDraft(initialEditId))
  const [previewStartedAt] = useState(() => Date.now() - 2_500)
  const [error, setError] = useState<string | null>(null)
  const fields = FIELD_LABELS[draft.theme]
  const update = (updates: Partial<LowerThirdDraft>) =>
    setDraft((current) => ({ ...current, ...updates }))
  const chooseStyle = (style: LowerThirdStyle) => {
    const option = LOWER_THIRD_STYLE_OPTIONS.find(
      (item) => item.value === style
    )
    if (!option) return
    update({
      style,
      backgroundColor: option.defaultBackgroundColor,
      textColor: option.defaultTextColor,
      accentColor: undefined,
      ...(isLowerThirdDesignStyle(style)
        ? {
            anchor: style === "centered" ? "bottom-center" : "bottom-left",
            xPercent: style === "centered" ? 50 : 5,
            yPercent: style === "centered" ? 91 : 89,
            widthPercent: style === "centered" ? 80 : 72,
            sizePercent: 100,
          }
        : { anchor: "center", xPercent: 30, yPercent: 82, widthPercent: 60 }),
    })
  }
  const preview: BroadcastOverlayPayload = {
    logos: [],
    ticker: null,
    lowerThird: {
      ...draft,
      id: initialEditId ?? "draft",
      title: draft.title.trim() || fields.title,
      subtitle: draft.subtitle?.trim() || undefined,
      label: draft.label?.trim() || undefined,
      durationMs: 86_400_000,
      startedAt: previewStartedAt,
    },
  }
  const save = () => {
    if (!draft.title.trim()) {
      setError(`Enter ${fields.title.toLowerCase()}.`)
      return
    }
    const store = useBroadcastStore.getState()
    const title = draft.title.trim()
    const id = store.saveLowerThirdPreset({
      ...draft,
      id: initialEditId,
      name: title,
      title,
      subtitle: draft.subtitle?.trim() || undefined,
      label: draft.label?.trim() || undefined,
    })
    store.saveLowerThirdAppearance({
      ...draft,
      style: draft.style ?? DEFAULT_LOWER_THIRD_STYLE,
      maxWidthEnabled: draft.maxWidthEnabled !== false,
    })
    if (
      useBroadcastStore.getState().stagedOverlays.lowerThird?.preset.id !== id
    )
      store.toggleStagedLowerThird(id)
    onDone?.()
  }
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <OverlayDesignPreview overlays={preview} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Theme
              <Select
                value={draft.theme}
                onValueChange={(theme) =>
                  update({ theme: theme as LowerThirdTheme })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preacher">Preacher</SelectItem>
                  <SelectItem value="speaker">Speaker / Guest</SelectItem>
                  <SelectItem value="notice">Notice</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Duration
              <Select
                value={String(draft.durationMs)}
                onValueChange={(duration) =>
                  update({ durationMs: Number(duration) })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 14, 20, 30, 90].map((seconds) => (
                    <SelectItem key={seconds} value={String(seconds * 1_000)}>
                      {seconds === 90
                        ? "1 minute 30 seconds"
                        : `${seconds} seconds`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="grid gap-1 text-xs font-medium">
            {fields.title}
            <Input
              value={draft.title}
              onChange={(event) => {
                setError(null)
                update({ title: event.target.value })
              }}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            {fields.subtitle}
            <Input
              value={draft.subtitle ?? ""}
              onChange={(event) => update({ subtitle: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            {fields.label}
            <Input
              value={draft.label ?? ""}
              onChange={(event) => update({ label: event.target.value })}
            />
          </label>
          <div className="flex items-center justify-between gap-3 text-xs font-medium">
            Show on
            <OutputTargetSelector
              value={draft.targetOutputIds}
              onChange={(targetOutputIds) => update({ targetOutputIds })}
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div className="grid content-start gap-3">
          <LowerThirdStylePicker
            value={draft.style ?? DEFAULT_LOWER_THIRD_STYLE}
            graphic={preview.lowerThird!}
            onChange={chooseStyle}
          />
          <details className="group rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium">
              More options
              <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border p-3">
              <LowerThirdAppearanceFields value={draft} onChange={update} />
            </div>
          </details>
        </div>
      </div>
      <DialogFooter className="items-center sm:justify-between">
        {initialEditId ? (
          <DeleteGraphicButton
            name={draft.title.trim() || "this lower third"}
            onDelete={() => {
              useBroadcastStore.getState().deleteLowerThirdPreset(initialEditId)
              onDone?.()
            }}
          />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="button" disabled={!draft.title.trim()} onClick={save}>
            Save to Preview
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
