import { useRef, useState, type ChangeEvent, type ReactNode } from "react"
import {
  ImagePlusIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  Settings2Icon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
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
import { Switch } from "@/components/ui/switch"
import { getOverlayPreviewPayload } from "@/lib/overlays"
import { getOverlayOutputMode } from "@/lib/broadcast-outputs"
import { cachePresentationMedia } from "@/lib/presentation-media"
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
  LowerThirdAppearanceSettings,
  LowerThirdLogoPosition,
  LowerThirdPreset,
  LowerThirdStyle,
  LowerThirdTheme,
} from "@/types"
import {
  DEFAULT_LOWER_THIRD_LOGO_POSITION,
  DEFAULT_LOWER_THIRD_STYLE,
  getDefaultLowerThirdStyleForTheme,
  LOWER_THIRD_STYLE_OPTIONS,
} from "@/types/overlays"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlaySection } from "./overlay-section"

const DEFAULT_TARGET_OUTPUT_IDS = ["main"]

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

const DEFAULT_X_PERCENT = 14
const DEFAULT_Y_PERCENT = 82
const DEFAULT_WIDTH_PERCENT = 50
const DEFAULT_STYLE_OPTION = LOWER_THIRD_STYLE_OPTIONS[0]

type LowerThirdAppearance = LowerThirdAppearanceSettings

function overrideOrFallback<K extends keyof LowerThirdAppearance>(
  overrides: Partial<LowerThirdAppearance> | undefined,
  key: K,
  fallback: LowerThirdAppearance[K]
): LowerThirdAppearance[K] {
  return overrides && key in overrides
    ? (overrides[key] as LowerThirdAppearance[K])
    : fallback
}

function getStyleOption(style: LowerThirdStyle) {
  return (
    LOWER_THIRD_STYLE_OPTIONS.find((option) => option.value === style) ??
    DEFAULT_STYLE_OPTION
  )
}

function LowerThirdStyleSelect({
  value,
  onChange,
}: {
  value: LowerThirdStyle
  onChange: (value: LowerThirdStyle) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as LowerThirdStyle)}
    >
      <SelectTrigger className="w-full" aria-label="Lower third layout style">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        className="w-[min(24rem,calc(100vw-2rem))]"
        viewportClassName="!h-auto max-h-[min(24rem,calc(100vh-8rem))]"
      >
        {LOWER_THIRD_STYLE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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

function AppearanceSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function LogoPositionToggle({
  value,
  onChange,
}: {
  value: LowerThirdLogoPosition
  onChange: (value: LowerThirdLogoPosition) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["left", "right"] as const).map((position) => (
        <Button
          key={position}
          type="button"
          variant={value === position ? "default" : "outline"}
          size="sm"
          className="capitalize"
          onClick={() => onChange(position)}
        >
          {position} corner
        </Button>
      ))}
    </div>
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
  const outputs = useBroadcastStore((state) => state.outputs)
  const selectedOverlayOutputId = useBroadcastStore(
    (state) => state.selectedOverlayOutputId
  )
  const previewVerse = useBroadcastStore((state) => state.previewVerse)
  const overlayConfig = useBroadcastStore((state) => state.overlayConfig)
  const activeOverlays = useBroadcastStore((state) => state.activeOverlays)
  const lastSavedAppearance = overlayConfig.lastLowerThirdAppearance
  const defaultTargets = useBroadcastStore(
    (state) =>
      state.overlayConfig.logo.logos[0]?.targetOutputIds ??
      DEFAULT_TARGET_OUTPUT_IDS
  )
  const savePreset = useBroadcastStore((state) => state.saveLowerThirdPreset)
  const saveAppearanceSettings = useBroadcastStore(
    (state) => state.saveLowerThirdAppearance
  )
  const deletePreset = useBroadcastStore(
    (state) => state.deleteLowerThirdPreset
  )
  const showPreset = useBroadcastStore((state) => state.showLowerThirdOverlay)
  const clearPreset = useBroadcastStore((state) => state.clearLowerThirdOverlay)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [theme, setTheme] = useState<LowerThirdTheme>("preacher")
  const [style, setStyle] = useState<LowerThirdStyle>(DEFAULT_LOWER_THIRD_STYLE)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [label, setLabel] = useState("")
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_STYLE_OPTION.defaultBackgroundColor
  )
  const [textColor, setTextColor] = useState<string>(
    DEFAULT_STYLE_OPTION.defaultTextColor
  )
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | undefined>(
    undefined
  )
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined)
  const [logoImageUrl, setLogoImageUrl] = useState<string | undefined>(
    undefined
  )
  const [logoPosition, setLogoPosition] = useState<LowerThirdLogoPosition>(
    DEFAULT_LOWER_THIRD_LOGO_POSITION
  )
  const [logoSizePercent, setLogoSizePercent] = useState(100)
  const [sizePercent, setSizePercent] = useState(100)
  const [maxWidthEnabled, setMaxWidthEnabled] = useState(true)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [appearance, setAppearance] = useState<LowerThirdAppearance>({
    backgroundColor: DEFAULT_STYLE_OPTION.defaultBackgroundColor,
    textColor: DEFAULT_STYLE_OPTION.defaultTextColor,
    accentColor: undefined,
    avatarImageUrl: undefined,
    logoImageUrl: undefined,
    logoPosition: DEFAULT_LOWER_THIRD_LOGO_POSITION,
    logoSizePercent: 100,
    sizePercent: 100,
    widthPercent: DEFAULT_WIDTH_PERCENT,
    xPercent: DEFAULT_X_PERCENT,
    yPercent: DEFAULT_Y_PERCENT,
    style: DEFAULT_LOWER_THIRD_STYLE,
    maxWidthEnabled: true,
    durationMs: 14_000,
  })
  const appearanceRef = useRef(appearance)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
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
  const selectedOverlayOutput =
    outputs.find(
      (output) =>
        output.id === selectedOverlayOutputId && output.content === "overlays"
    ) ?? outputs.find((output) => output.content === "overlays")
  const appearancePreviewMode = selectedOverlayOutput
    ? (getOverlayOutputMode(selectedOverlayOutput) ?? "dsk-luma")
    : "dsk-luma"
  const previewTheme = getThemeForProgramContent(
    {
      activeThemeId: sectionThemeIds.bible,
      sectionThemeIds,
      themes,
    },
    previewVerse,
    "bible"
  )
  const basePreviewOverlays = getOverlayPreviewPayload(
    overlayConfig,
    activeOverlays
  )
  const appearancePreviewOverlays: BroadcastOverlayPayload = {
    ...basePreviewOverlays,
    ticker:
      appearance.style === "full-width-banner"
        ? null
        : basePreviewOverlays.ticker,
    lowerThird: {
      id: appearanceTargetId ?? "lower-third-appearance-preview",
      theme: appearanceTheme,
      title: appearanceTitle,
      subtitle: appearanceSubtitle,
      label: appearanceLabel,
      backgroundColor: appearance.backgroundColor,
      textColor: appearance.textColor,
      accentColor: appearance.accentColor,
      avatarImageUrl: appearance.avatarImageUrl,
      logoImageUrl: appearance.logoImageUrl,
      logoPosition: appearance.logoPosition,
      logoSizePercent: appearance.logoSizePercent,
      sizePercent: appearance.sizePercent,
      widthPercent: appearance.widthPercent,
      style: appearance.style,
      maxWidthEnabled: appearance.maxWidthEnabled,
      xPercent: appearance.xPercent,
      yPercent: appearance.yPercent,
      durationMs: 86_400_000,
      startedAt: appearancePreviewStartedAt,
    },
  }

  const loadPreset = (preset: LowerThirdPreset) => {
    setEditingId(preset.id)
    setTheme(preset.theme)
    setStyle(preset.style ?? getDefaultLowerThirdStyleForTheme(preset.theme))
    setTitle(preset.title)
    setSubtitle(preset.subtitle ?? "")
    setLabel(preset.label ?? "")
    setBackgroundColor(preset.backgroundColor)
    setTextColor(preset.textColor)
    setAvatarImageUrl(preset.avatarImageUrl)
    setAccentColor(preset.accentColor)
    setLogoImageUrl(preset.logoImageUrl)
    setLogoPosition(preset.logoPosition ?? DEFAULT_LOWER_THIRD_LOGO_POSITION)
    setLogoSizePercent(preset.logoSizePercent ?? 100)
    setSizePercent(preset.sizePercent ?? 100)
    setMaxWidthEnabled(preset.maxWidthEnabled !== false)
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
    setStyle(DEFAULT_LOWER_THIRD_STYLE)
    setBackgroundColor(DEFAULT_STYLE_OPTION.defaultBackgroundColor)
    setTextColor(DEFAULT_STYLE_OPTION.defaultTextColor)
    setAvatarImageUrl(undefined)
    setAccentColor(undefined)
    setLogoImageUrl(undefined)
    setLogoPosition(DEFAULT_LOWER_THIRD_LOGO_POSITION)
    setLogoSizePercent(100)
    setSizePercent(100)
    setMaxWidthEnabled(true)
    setDurationSeconds(14)
    setWidthPercent(DEFAULT_WIDTH_PERCENT)
    setXPercent(DEFAULT_X_PERCENT)
    setYPercent(DEFAULT_Y_PERCENT)
    setTargetOutputIds(defaultTargets)
  }

  const handleStyleChange = (nextStyle: LowerThirdStyle) => {
    setStyle(nextStyle)
  }

  const save = (colorOverrides?: Partial<LowerThirdAppearance>) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return null
    const nextBackgroundColor =
      colorOverrides?.backgroundColor ?? backgroundColor
    const nextTextColor = colorOverrides?.textColor ?? textColor
    const nextAvatarImageUrl = overrideOrFallback(
      colorOverrides,
      "avatarImageUrl",
      avatarImageUrl
    )
    const nextAccentColor = overrideOrFallback(
      colorOverrides,
      "accentColor",
      accentColor
    )
    const nextLogoImageUrl = overrideOrFallback(
      colorOverrides,
      "logoImageUrl",
      logoImageUrl
    )
    const nextLogoPosition = colorOverrides?.logoPosition ?? logoPosition
    const nextLogoSizePercent =
      colorOverrides?.logoSizePercent ?? logoSizePercent
    const nextSizePercent = colorOverrides?.sizePercent ?? sizePercent
    const nextStyle = colorOverrides?.style ?? style
    const nextMaxWidthEnabled =
      colorOverrides?.maxWidthEnabled ?? maxWidthEnabled
    const nextWidthPercent = colorOverrides?.widthPercent ?? widthPercent
    const nextXPercent = colorOverrides?.xPercent ?? xPercent
    const nextYPercent = colorOverrides?.yPercent ?? yPercent
    const nextDurationMs = colorOverrides?.durationMs ?? durationSeconds * 1000
    const id = savePreset({
      id: editingId,
      name: trimmedTitle,
      theme,
      style: nextStyle,
      title: trimmedTitle,
      subtitle: subtitle.trim() || undefined,
      label: label.trim() || undefined,
      backgroundColor: nextBackgroundColor,
      textColor: nextTextColor,
      accentColor: nextAccentColor,
      avatarImageUrl: nextAvatarImageUrl,
      logoImageUrl: nextLogoImageUrl,
      logoPosition: nextLogoPosition,
      logoSizePercent: nextLogoSizePercent,
      sizePercent: nextSizePercent,
      widthPercent: nextWidthPercent,
      maxWidthEnabled: nextMaxWidthEnabled,
      xPercent: nextXPercent,
      yPercent: nextYPercent,
      durationMs: nextDurationMs,
      targetOutputIds,
    })
    saveAppearanceSettings({
      backgroundColor: nextBackgroundColor,
      textColor: nextTextColor,
      accentColor: nextAccentColor,
      avatarImageUrl: nextAvatarImageUrl,
      logoImageUrl: nextLogoImageUrl,
      logoPosition: nextLogoPosition,
      logoSizePercent: nextLogoSizePercent,
      sizePercent: nextSizePercent,
      widthPercent: nextWidthPercent,
      xPercent: nextXPercent,
      yPercent: nextYPercent,
      style: nextStyle,
      maxWidthEnabled: nextMaxWidthEnabled,
      durationMs: nextDurationMs,
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
            accentColor: activePreset.accentColor,
            avatarImageUrl: activePreset.avatarImageUrl,
            logoImageUrl: activePreset.logoImageUrl,
            logoPosition:
              activePreset.logoPosition ?? DEFAULT_LOWER_THIRD_LOGO_POSITION,
            logoSizePercent: activePreset.logoSizePercent ?? 100,
            sizePercent: activePreset.sizePercent ?? 100,
            widthPercent: activePreset.widthPercent,
            style:
              activePreset.style ??
              getDefaultLowerThirdStyleForTheme(activePreset.theme),
            maxWidthEnabled: activePreset.maxWidthEnabled !== false,
            xPercent: activePreset.xPercent,
            yPercent: activePreset.yPercent,
            durationMs: activePreset.durationMs,
          }
        : !editingId && lastSavedAppearance
          ? { ...lastSavedAppearance }
          : {
              backgroundColor,
              textColor,
              accentColor,
              avatarImageUrl,
              logoImageUrl,
              logoPosition,
              logoSizePercent,
              sizePercent,
              widthPercent,
              style,
              maxWidthEnabled,
              xPercent,
              yPercent,
              durationMs: durationSeconds * 1000,
            }
    appearanceRef.current = nextAppearance
    setAppearance(nextAppearance)
    setAppearanceTargetId(targetId ?? null)
    setAppearancePreviewStartedAt(Date.now() - 2_500)
    setAppearanceOpen(true)
  }

  const updateAppearance = (updates: Partial<typeof appearance>) => {
    const nextAppearance = { ...appearanceRef.current, ...updates }
    appearanceRef.current = nextAppearance
    setAppearance(nextAppearance)
  }

  const handleAppearanceStyleChange = (nextStyle: LowerThirdStyle) => {
    updateAppearance({ style: nextStyle })
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setAvatarUploading(true)
    try {
      const url = await cachePresentationMedia(file, file.name)
      updateAppearance({ avatarImageUrl: url })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load photo."
      )
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setLogoUploading(true)
    try {
      const url = await cachePresentationMedia(file, file.name)
      updateAppearance({ logoImageUrl: url })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load logo."
      )
    } finally {
      setLogoUploading(false)
    }
  }

  const cancelAppearance = () => {
    setAppearanceOpen(false)
  }

  const saveAppearance = () => {
    setBackgroundColor(appearance.backgroundColor)
    setTextColor(appearance.textColor)
    setAvatarImageUrl(appearance.avatarImageUrl)
    setAccentColor(appearance.accentColor)
    setLogoImageUrl(appearance.logoImageUrl)
    setLogoPosition(
      appearance.logoPosition ?? DEFAULT_LOWER_THIRD_LOGO_POSITION
    )
    setLogoSizePercent(appearance.logoSizePercent ?? 100)
    setSizePercent(appearance.sizePercent ?? 100)
    setStyle(appearance.style)
    setMaxWidthEnabled(appearance.maxWidthEnabled)
    setWidthPercent(appearance.widthPercent)
    setXPercent(appearance.xPercent)
    setYPercent(appearance.yPercent)
    setDurationSeconds(appearance.durationMs / 1000)
    saveAppearanceSettings(appearance)
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
          accentColor: appearance.accentColor,
          avatarImageUrl: appearance.avatarImageUrl,
          logoImageUrl: appearance.logoImageUrl,
          logoPosition: appearance.logoPosition,
          logoSizePercent: appearance.logoSizePercent,
          sizePercent: appearance.sizePercent,
          widthPercent: appearance.widthPercent,
          style: appearance.style,
          maxWidthEnabled: appearance.maxWidthEnabled,
          xPercent: appearance.xPercent,
          yPercent: appearance.yPercent,
          durationMs: appearance.durationMs,
        })
      }
    }
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
          Layout style
          <LowerThirdStyleSelect value={style} onChange={handleStyleChange} />
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
              {[10, 14, 20, 30, 90].map((seconds) => (
                <SelectItem key={seconds} value={String(seconds)}>
                  {seconds === 90
                    ? "1 minute 30 seconds"
                    : `${seconds} seconds`}
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
                    {
                      getStyleOption(
                        preset.style ??
                          getDefaultLowerThirdStyleForTheme(preset.theme)
                      ).label
                    }{" "}
                    · {preset.durationMs / 1000}s
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit lower third"
                  title="Edit lower third"
                  onClick={(event) => {
                    event.stopPropagation()
                    loadPreset(preset)
                  }}
                >
                  <PencilIcon />
                </Button>
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
        <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Lower third appearance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-3 py-2 text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
                Preview
              </div>
              <div className="aspect-video w-full overflow-hidden bg-black">
                <CanvasVerse
                  theme={previewTheme}
                  verse={null}
                  timer={null}
                  overlays={appearancePreviewOverlays}
                  overlayMode={appearancePreviewMode}
                  className="h-full"
                  fillContainer
                />
              </div>
            </div>

            <AppearanceSection title="Style">
              <LowerThirdStyleSelect
                value={appearance.style}
                onChange={handleAppearanceStyleChange}
              />
            </AppearanceSection>

            <AppearanceSection title="Colors">
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorInput
                  label="Background"
                  value={appearance.backgroundColor}
                  onChange={(backgroundColor) =>
                    updateAppearance({ backgroundColor })
                  }
                />
                <ColorInput
                  label="Text"
                  value={appearance.textColor}
                  onChange={(textColor) => updateAppearance({ textColor })}
                />
                <div className="grid gap-1">
                  <ColorInput
                    label="Accent"
                    value={appearance.accentColor ?? "#2563eb"}
                    onChange={(accentColor) =>
                      updateAppearance({ accentColor })
                    }
                  />
                  {appearance.accentColor ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        updateAppearance({ accentColor: undefined })
                      }
                    >
                      <RotateCcwIcon className="size-3" /> Style default
                    </button>
                  ) : null}
                </div>
              </div>
            </AppearanceSection>

            {appearance.style === "dark-avatar-blue" ? (
              <AppearanceSection
                title="Avatar photo"
                description="Shown in the avatar block. Falls back to a generic icon when empty."
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {appearance.avatarImageUrl ? (
                      <img
                        src={appearance.avatarImageUrl}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[0.625rem] text-muted-foreground">
                        No photo
                      </span>
                    )}
                  </div>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void handleAvatarUpload(event)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    <ImagePlusIcon />
                    {appearance.avatarImageUrl ? "Replace" : "Upload"}
                  </Button>
                  {appearance.avatarImageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove avatar photo"
                      onClick={() =>
                        updateAppearance({ avatarImageUrl: undefined })
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </div>
              </AppearanceSection>
            ) : null}

            <AppearanceSection
              title="Logo badge"
              description="Optional badge pinned to a corner of the lower third, e.g. a sponsor or organization mark."
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {appearance.logoImageUrl ? (
                    <img
                      src={appearance.logoImageUrl}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[0.625rem] text-muted-foreground">
                      No logo
                    </span>
                  )}
                </div>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                  className="hidden"
                  onChange={(event) => void handleLogoUpload(event)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  <ImagePlusIcon />
                  {appearance.logoImageUrl ? "Replace" : "Upload"}
                </Button>
                {appearance.logoImageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove logo"
                    onClick={() =>
                      updateAppearance({ logoImageUrl: undefined })
                    }
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>
              {appearance.logoImageUrl ? (
                <>
                  <LogoPositionToggle
                    value={
                      appearance.logoPosition ??
                      DEFAULT_LOWER_THIRD_LOGO_POSITION
                    }
                    onChange={(logoPosition) =>
                      updateAppearance({ logoPosition })
                    }
                  />
                  <SliderField
                    label="Logo size"
                    min={50}
                    max={160}
                    value={appearance.logoSizePercent ?? 100}
                    unit="%"
                    defaultValue={100}
                    onChange={(logoSizePercent) =>
                      updateAppearance({ logoSizePercent })
                    }
                  />
                </>
              ) : null}
            </AppearanceSection>

            <AppearanceSection
              title="Size"
              description="Scales the entire graphic up or down."
            >
              <SliderField
                label="Overall size"
                min={70}
                max={130}
                value={appearance.sizePercent ?? 100}
                unit="%"
                defaultValue={100}
                onChange={(sizePercent) => updateAppearance({ sizePercent })}
              />
            </AppearanceSection>

            <AppearanceSection title="Width">
              <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">No maximum width</p>
                  <p className="text-xs text-muted-foreground">
                    Size to content until the safe output boundary, then wrap.
                  </p>
                </div>
                <Switch
                  aria-label="No maximum width"
                  checked={!appearance.maxWidthEnabled}
                  onCheckedChange={(noMaximumWidth) =>
                    updateAppearance({ maxWidthEnabled: !noMaximumWidth })
                  }
                />
              </div>
              {appearance.maxWidthEnabled ? (
                <SliderField
                  label="Maximum width"
                  min={25}
                  max={90}
                  value={appearance.widthPercent}
                  unit="%"
                  defaultValue={DEFAULT_WIDTH_PERCENT}
                  onChange={(widthPercent) =>
                    updateAppearance({ widthPercent })
                  }
                />
              ) : (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Natural width is active. The renderer still keeps a safe
                  margin and wraps long text.
                </p>
              )}
            </AppearanceSection>

            <AppearanceSection title="Position">
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
            </AppearanceSection>
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
