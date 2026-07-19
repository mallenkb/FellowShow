import { useRef, useState } from "react"
import { PlayIcon, Settings2Icon, SquareIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SliderField } from "@/components/ui/slider-field"
import {
  DEFAULT_LOWER_THIRD_BACKGROUND_COLOR,
  DEFAULT_LOWER_THIRD_TEXT_COLOR,
  getOverlayPayloadForOutput,
} from "@/lib/overlays"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
import type {
  BroadcastOverlayPayload,
  LowerThirdPreset,
  LowerThirdTheme,
} from "@/types"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlaySection } from "./overlay-section"

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

const DEFAULT_X_PERCENT = 30
const DEFAULT_Y_PERCENT = 82
const DEFAULT_WIDTH_PERCENT = 50

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-xs text-muted-foreground uppercase">{value}</span>
      </div>
    </label>
  )
}

export function LowerThirdOverlaySection() {
  const presets = useBroadcastStore(
    (state) => state.overlayConfig.lowerThirdPresets
  )
  const activePresetId = useBroadcastStore(
    (state) => state.activeOverlays.lowerThird?.preset.id ?? null
  )
  const themes = useBroadcastStore((state) => state.themes)
  const sectionThemeIds = useBroadcastStore((state) => state.sectionThemeIds)
  const previewVerse = useBroadcastStore((state) => state.previewVerse)
  const previewTimer = useBroadcastStore((state) => state.previewTimer)
  const overlayConfig = useBroadcastStore((state) => state.overlayConfig)
  const activeOverlays = useBroadcastStore((state) => state.activeOverlays)
  const defaultTargets = useBroadcastStore(
    (state) => state.overlayConfig.logo.logos[0]?.targetOutputIds ?? ["main"]
  )
  const savePreset = useBroadcastStore((state) => state.saveLowerThirdPreset)
  const deletePreset = useBroadcastStore(
    (state) => state.deleteLowerThirdPreset
  )
  const showPreset = useBroadcastStore((state) => state.showLowerThirdOverlay)
  const clearPreset = useBroadcastStore((state) => state.clearLowerThirdOverlay)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [theme, setTheme] = useState<LowerThirdTheme>("preacher")
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [label, setLabel] = useState("")
  const [backgroundColor, setBackgroundColor] = useState(
    DEFAULT_LOWER_THIRD_BACKGROUND_COLOR
  )
  const [textColor, setTextColor] = useState(DEFAULT_LOWER_THIRD_TEXT_COLOR)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [appearance, setAppearance] = useState({
    backgroundColor: DEFAULT_LOWER_THIRD_BACKGROUND_COLOR,
    textColor: DEFAULT_LOWER_THIRD_TEXT_COLOR,
    widthPercent: DEFAULT_WIDTH_PERCENT,
    xPercent: DEFAULT_X_PERCENT,
    yPercent: DEFAULT_Y_PERCENT,
  })
  const appearanceRef = useRef(appearance)
  const originalLivePresetRef = useRef<LowerThirdPreset | null>(null)
  const [appearanceTargetId, setAppearanceTargetId] = useState<string | null>(
    null
  )
  const [appearancePreviewStartedAt, setAppearancePreviewStartedAt] =
    useState(0)
  const [durationSeconds, setDurationSeconds] = useState(14)
  const [widthPercent, setWidthPercent] = useState(DEFAULT_WIDTH_PERCENT)
  const [xPercent, setXPercent] = useState(DEFAULT_X_PERCENT)
  const [yPercent, setYPercent] = useState(DEFAULT_Y_PERCENT)
  const [targetOutputIds, setTargetOutputIds] = useState(defaultTargets)
  const fields = FIELD_LABELS[theme]
  const appearanceTargetPreset = presets.find(
    (preset) => preset.id === appearanceTargetId
  )
  const appearanceTitle =
    editingId || !appearanceTargetPreset
      ? title.trim() || "Preacher's name"
      : appearanceTargetPreset.title
  const appearanceSubtitle =
    editingId || !appearanceTargetPreset
      ? subtitle.trim() || undefined
      : appearanceTargetPreset.subtitle
  const appearanceLabel =
    editingId || !appearanceTargetPreset
      ? label.trim() || undefined
      : appearanceTargetPreset.label
  const appearanceTheme = appearanceTargetPreset?.theme ?? theme
  const previewTheme = getThemeForProgramContent(
    {
      activeThemeId: sectionThemeIds.bible,
      sectionThemeIds,
      themes,
    },
    previewVerse,
    "bible"
  )
  const basePreviewOverlays = getOverlayPayloadForOutput(
    overlayConfig,
    activeOverlays,
    "main"
  )
  const appearancePreviewOverlays: BroadcastOverlayPayload = {
    ...basePreviewOverlays,
    lowerThird: {
      id: appearanceTargetId ?? "lower-third-appearance-preview",
      theme: appearanceTheme,
      title: appearanceTitle,
      subtitle: appearanceSubtitle,
      label: appearanceLabel,
      backgroundColor: appearance.backgroundColor,
      textColor: appearance.textColor,
      widthPercent: appearance.widthPercent,
      xPercent: appearance.xPercent,
      yPercent: appearance.yPercent,
      durationMs: 86_400_000,
      startedAt: appearancePreviewStartedAt,
    },
  }

  const loadPreset = (preset: LowerThirdPreset) => {
    setEditingId(preset.id)
    setTheme(preset.theme)
    setTitle(preset.title)
    setSubtitle(preset.subtitle ?? "")
    setLabel(preset.label ?? "")
    setBackgroundColor(preset.backgroundColor)
    setTextColor(preset.textColor)
    setDurationSeconds(preset.durationMs / 1000)
    setWidthPercent(preset.widthPercent)
    setXPercent(preset.xPercent)
    setYPercent(preset.yPercent)
    setTargetOutputIds(preset.targetOutputIds)
  }

  const resetComposer = () => {
    setEditingId(undefined)
    setTitle("")
    setSubtitle("")
    setLabel("")
    setBackgroundColor(DEFAULT_LOWER_THIRD_BACKGROUND_COLOR)
    setTextColor(DEFAULT_LOWER_THIRD_TEXT_COLOR)
    setDurationSeconds(14)
    setWidthPercent(DEFAULT_WIDTH_PERCENT)
    setXPercent(DEFAULT_X_PERCENT)
    setYPercent(DEFAULT_Y_PERCENT)
    setTargetOutputIds(defaultTargets)
  }

  const save = (colorOverrides?: Partial<typeof appearance>) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return null
    const nextBackgroundColor =
      colorOverrides?.backgroundColor ?? backgroundColor
    const nextTextColor = colorOverrides?.textColor ?? textColor
    const nextWidthPercent = colorOverrides?.widthPercent ?? widthPercent
    const nextXPercent = colorOverrides?.xPercent ?? xPercent
    const nextYPercent = colorOverrides?.yPercent ?? yPercent
    const id = savePreset({
      id: editingId,
      name: trimmedTitle,
      theme,
      title: trimmedTitle,
      subtitle: subtitle.trim() || undefined,
      label: label.trim() || undefined,
      backgroundColor: nextBackgroundColor,
      textColor: nextTextColor,
      widthPercent: nextWidthPercent,
      xPercent: nextXPercent,
      yPercent: nextYPercent,
      durationMs: durationSeconds * 1000,
      targetOutputIds,
    })
    setEditingId(id)
    return id
  }

  const openAppearance = () => {
    const targetId = editingId ?? activePresetId
    const activePreset = presets.find((preset) => preset.id === activePresetId)
    const nextAppearance =
      !editingId && activePreset
        ? {
            backgroundColor: activePreset.backgroundColor,
            textColor: activePreset.textColor,
            widthPercent: activePreset.widthPercent,
            xPercent: activePreset.xPercent,
            yPercent: activePreset.yPercent,
          }
        : { backgroundColor, textColor, widthPercent, xPercent, yPercent }
    appearanceRef.current = nextAppearance
    originalLivePresetRef.current =
      targetId && targetId === activePresetId ? (activePreset ?? null) : null
    setAppearance(nextAppearance)
    setAppearanceTargetId(targetId ?? null)
    setAppearancePreviewStartedAt(Date.now() - 2_500)
    setAppearanceOpen(true)
  }

  const updateAppearance = (updates: Partial<typeof appearance>) => {
    const nextAppearance = { ...appearanceRef.current, ...updates }
    appearanceRef.current = nextAppearance
    setAppearance(nextAppearance)

    const livePreset = originalLivePresetRef.current
    if (livePreset) {
      savePreset({ ...livePreset, ...nextAppearance })
    }
  }

  const cancelAppearance = () => {
    const originalLivePreset = originalLivePresetRef.current
    originalLivePresetRef.current = null
    if (originalLivePreset) savePreset(originalLivePreset)
    setAppearanceOpen(false)
  }

  const saveAppearance = () => {
    setBackgroundColor(appearance.backgroundColor)
    setTextColor(appearance.textColor)
    setWidthPercent(appearance.widthPercent)
    setXPercent(appearance.xPercent)
    setYPercent(appearance.yPercent)
    if (editingId && title.trim()) {
      save(appearance)
    } else {
      const activePreset = presets.find(
        (preset) => preset.id === activePresetId
      )
      if (activePreset) {
        savePreset({
          ...activePreset,
          backgroundColor: appearance.backgroundColor,
          textColor: appearance.textColor,
          widthPercent: appearance.widthPercent,
          xPercent: appearance.xPercent,
          yPercent: appearance.yPercent,
        })
      }
    }
    originalLivePresetRef.current = null
    setAppearanceOpen(false)
  }

  const saveAndShow = () => {
    const id = save()
    if (id) showPreset(id)
  }

  return (
    <OverlaySection
      title="Lower third"
      description="Fades out automatically after the selected duration."
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Lower third appearance"
            title="Lower third appearance"
            onClick={openAppearance}
          >
            <Settings2Icon />
          </Button>
          {activePresetId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearPreset}
            >
              <SquareIcon /> Hide
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium">
          Theme
          <Select
            value={theme}
            onValueChange={(value) => setTheme(value as LowerThirdTheme)}
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
            value={String(durationSeconds)}
            onValueChange={(value) => setDurationSeconds(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 14, 20, 30].map((seconds) => (
                <SelectItem key={seconds} value={String(seconds)}>
                  {seconds} seconds
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          {fields.title}
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          {fields.subtitle}
          <Input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium sm:col-span-2">
          {fields.label}
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <OutputTargetSelector
          value={targetOutputIds}
          onChange={setTargetOutputIds}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!title.trim()}
          onClick={() => save()}
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!title.trim()}
          onClick={saveAndShow}
        >
          <PlayIcon /> Show
        </Button>
        {editingId ? (
          <button
            type="button"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={resetComposer}
          >
            + New lower third
          </button>
        ) : null}
      </div>
      {presets.length > 0 ? (
        <div className="mt-3 grid gap-1.5">
          {presets.map((preset) => {
            const isActive = preset.id === activePresetId
            return (
              <div
                key={preset.id}
                role="button"
                tabIndex={0}
                onClick={() => loadPreset(preset)}
                onDoubleClick={() => showPreset(preset.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") showPreset(preset.id)
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {preset.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground capitalize">
                    {preset.theme} · {preset.durationMs / 1000}s
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    isActive ? "Hide lower third" : "Show lower third"
                  }
                  onClick={(event) => {
                    event.stopPropagation()
                    if (isActive) clearPreset()
                    else showPreset(preset.id)
                  }}
                >
                  {isActive ? <SquareIcon /> : <PlayIcon />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete lower third"
                  onClick={(event) => {
                    event.stopPropagation()
                    deletePreset(preset.id)
                    if (editingId === preset.id) resetComposer()
                  }}
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })}
        </div>
      ) : null}
      <Dialog
        open={appearanceOpen}
        onOpenChange={(open) => {
          if (!open) cancelAppearance()
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Lower third appearance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="border-b border-border px-3 py-2 text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
                Preview
              </div>
              <div className="aspect-video w-full overflow-hidden bg-black">
                <CanvasVerse
                  theme={previewTheme}
                  verse={previewVerse}
                  timer={previewTimer}
                  overlays={appearancePreviewOverlays}
                  className="h-full"
                  fillContainer
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorInput
                label="Background color"
                value={appearance.backgroundColor}
                onChange={(backgroundColor) =>
                  updateAppearance({ backgroundColor })
                }
              />
              <ColorInput
                label="Text color"
                value={appearance.textColor}
                onChange={(textColor) => updateAppearance({ textColor })}
              />
            </div>
            <SliderField
              label="Maximum width"
              min={25}
              max={90}
              value={appearance.widthPercent}
              unit="%"
              defaultValue={DEFAULT_WIDTH_PERCENT}
              onChange={(widthPercent) => updateAppearance({ widthPercent })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SliderField
                label="Horizontal position"
                min={0}
                max={100}
                value={appearance.xPercent}
                unit="%"
                defaultValue={DEFAULT_X_PERCENT}
                onChange={(xPercent) => updateAppearance({ xPercent })}
              />
              <SliderField
                label="Vertical position"
                min={0}
                max={100}
                value={appearance.yPercent}
                unit="%"
                defaultValue={DEFAULT_Y_PERCENT}
                onChange={(yPercent) => updateAppearance({ yPercent })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelAppearance}>
              Cancel
            </Button>
            <Button type="button" onClick={saveAppearance}>
              Save appearance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OverlaySection>
  )
}
