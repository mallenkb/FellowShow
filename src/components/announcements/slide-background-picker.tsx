import type { CSSProperties } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ImageIcon,
  RotateCcwIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MediaBackgroundAdjust } from "@/components/announcements/media-background-adjust"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SLIDE_BACKGROUND_COLORS } from "@/lib/slide-background"
import { pickThemeBackgroundMedia } from "@/lib/theme-designer-files"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import { isSelectableTheme } from "@/stores/broadcast-store-helpers"
import type { BroadcastTheme, SlideBackgroundChoice } from "@/types"

const labelSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null

function truncateLabel(label: string): string {
  const characters = labelSegmenter
    ? Array.from(labelSegmenter.segment(label), (part) => part.segment)
    : Array.from(label)
  return characters.length > 12
    ? `${characters.slice(0, 11).join("").trimEnd()}…`
    : label
}

function swatchStyle(background: BroadcastTheme["background"]): CSSProperties {
  if (background.type === "image" && background.image) {
    return background.image.mediaType === "video"
      ? { background: "#111" }
      : {
          backgroundImage: `url("${background.image.url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
  }
  if (background.type === "gradient" && background.gradient) {
    const stops = background.gradient.stops
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(", ")
    return {
      background:
        background.gradient.type === "radial"
          ? `radial-gradient(${stops})`
          : `linear-gradient(${background.gradient.angle}deg, ${stops})`,
    }
  }
  return { background: background.color }
}

function choiceLabel(
  choice: SlideBackgroundChoice | undefined,
  selectedTheme: BroadcastTheme | undefined
): string {
  if (!choice) return selectedTheme?.name ?? "Theme background"
  if (choice.type === "solid") return `Color ${choice.color.toUpperCase()}`
  if (choice.type === "media") {
    return choice.mediaType === "video" ? "Your video" : "Your image"
  }
  return selectedTheme?.name ?? "Theme no longer exists"
}

export function SlideBackgroundPicker({
  value,
  onChange,
}: {
  value: SlideBackgroundChoice | undefined
  onChange: (choice: SlideBackgroundChoice | null) => void
}) {
  const themes = useBroadcastStore((state) => state.themes)
  const announcementThemeId = useBroadcastStore(
    (state) => state.sectionThemeIds.announcements ?? state.activeThemeId
  )
  const backgroundThemes = themes.filter(
    (theme) =>
      isSelectableTheme(theme) && theme.background.type !== "transparent"
  )
  const selectedColor = value?.type === "solid" ? value.color : null
  const selectedThemeId = value?.type === "theme" ? value.themeId : null
  const selectedTheme = selectedThemeId
    ? themes.find((theme) => theme.id === selectedThemeId)
    : !value
      ? (themes.find((theme) => theme.id === announcementThemeId) ?? themes[0])
      : undefined
  const label = choiceLabel(value, selectedTheme)
  const backgroundStyle =
    value?.type === "solid"
      ? { background: value.color }
      : value?.type === "media" && value.mediaType === "image"
        ? {
            backgroundImage: `url("${value.url}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : selectedTheme
          ? swatchStyle(selectedTheme.background)
          : undefined
  const videoUrl =
    value?.type === "media" && value.mediaType === "video"
      ? value.url
      : selectedTheme?.background.type === "image" &&
          selectedTheme.background.image?.mediaType === "video"
        ? selectedTheme.background.image.url
        : undefined

  const upload = async () => {
    try {
      const media = await pickThemeBackgroundMedia()
      if (!media) return
      onChange({ type: "media", url: media.url, mediaType: media.mediaType })
      toast.success(
        media.mediaType === "video" ? "Video background set" : "Background set"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load that file"
      )
    }
  }

  return (
    <div className="max-w-full min-w-0">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Background: ${label}`}
            title={label}
            className="h-8 max-w-[min(12rem,100%)] justify-start gap-1.5"
          >
            <span
              aria-hidden="true"
              className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted"
              style={backgroundStyle}
            >
              {videoUrl ? (
                <video
                  src={videoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
              ) : !backgroundStyle ? (
                <ImageIcon className="size-2.5 text-muted-foreground" />
              ) : null}
            </span>
            <span className="min-w-0 truncate">{truncateLabel(label)}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="max-h-[min(36rem,80vh)] w-[22rem] max-w-[calc(100vw-2rem)] overflow-y-auto p-3"
        >
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant={value ? "ghost" : "secondary"}
              size="sm"
              className="justify-start"
              onClick={() => onChange(null)}
            >
              <RotateCcwIcon className="size-3.5" />
              Use the announcements theme
              {value ? null : <CheckIcon className="ml-auto size-3.5" />}
            </Button>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Color</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {SLIDE_BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Color ${color}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => onChange({ type: "solid", color })}
                    className={cn(
                      "size-7 rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedColor === color && "ring-2 ring-primary-emphasis"
                    )}
                    style={{ background: color }}
                  />
                ))}
                <label
                  className="relative flex size-7 cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
                  title="Pick any color"
                >
                  +
                  <input
                    type="color"
                    aria-label="Pick any color"
                    value={selectedColor ?? "#0f2430"}
                    onChange={(event) =>
                      onChange({ type: "solid", color: event.target.value })
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>

            {backgroundThemes.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  From a theme
                </p>
                <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto p-1">
                  {backgroundThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      aria-pressed={selectedThemeId === theme.id}
                      onClick={() =>
                        onChange({ type: "theme", themeId: theme.id })
                      }
                      className={cn(
                        "flex flex-col gap-1 rounded-md p-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                        selectedThemeId === theme.id &&
                          "ring-2 ring-primary-emphasis"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="aspect-video w-full rounded-sm border border-border"
                        style={swatchStyle(theme.background)}
                      />
                      <span
                        title={theme.name}
                        className="line-clamp-2 text-[11px] leading-tight break-words"
                      >
                        {theme.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void upload()}
            >
              <ImageIcon className="size-3.5" />
              {value?.type === "media"
                ? "Replace image or video"
                : "Use your own image or video"}
            </Button>
            {value?.type === "media" ? (
              <MediaBackgroundAdjust value={value} onChange={onChange} />
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
