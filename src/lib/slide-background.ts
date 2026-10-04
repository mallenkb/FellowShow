import type {
  BroadcastTheme,
  SlideBackgroundChoice,
  VerseRenderData,
} from "@/types"

type ThemeBackground = BroadcastTheme["background"]

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export const SLIDE_BACKGROUND_COLORS = [
  "#000000",
  "#0f2430",
  "#14110a",
  "#1f3d36",
  "#2a1215",
  "#1e1b4b",
  "#3a2a4a",
  "#f5f1e6",
]

function numberInRange(
  value: unknown,
  minimum: number,
  maximum: number
): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : undefined
}

export function sanitizeSlideBackground(
  value: unknown
): SlideBackgroundChoice | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const choice = value as Record<string, unknown>
  if (
    choice.type === "solid" &&
    typeof choice.color === "string" &&
    HEX_COLOR.test(choice.color)
  ) {
    return { type: "solid", color: choice.color }
  }
  if (choice.type === "theme" && typeof choice.themeId === "string") {
    return { type: "theme", themeId: choice.themeId }
  }
  if (
    choice.type === "media" &&
    typeof choice.url === "string" &&
    choice.url &&
    (choice.mediaType === "image" || choice.mediaType === "video")
  ) {
    const framing = {
      opacity: numberInRange(choice.opacity, 0, 100),
      scale: numberInRange(choice.scale, 1, 4),
      offsetX: numberInRange(choice.offsetX, -1, 1),
      offsetY: numberInRange(choice.offsetY, -1, 1),
    }
    return {
      type: "media",
      url: choice.url,
      mediaType: choice.mediaType,
      ...(choice.fit === "contain" ? { fit: "contain" as const } : {}),
      ...Object.fromEntries(
        Object.entries(framing).filter(([, value]) => value !== undefined)
      ),
    }
  }
  return undefined
}

/** Turns a slide's choice into a full theme background, or undefined to keep the theme's. */
export function resolveSlideBackground(
  choice: SlideBackgroundChoice | undefined,
  themes: readonly BroadcastTheme[]
): ThemeBackground | undefined {
  if (!choice) return undefined
  if (choice.type === "solid") {
    return { type: "solid", color: choice.color, gradient: null, image: null }
  }
  if (choice.type === "theme") {
    const theme = themes.find((candidate) => candidate.id === choice.themeId)
    return theme ? structuredClone(theme.background) : undefined
  }
  return {
    type: "image",
    color: "#000000",
    gradient: null,
    image: {
      url: choice.url,
      mediaType: choice.mediaType,
      fit: choice.fit ?? "cover",
      blur: 0,
      brightness: 75,
      tint: null,
      opacity: choice.opacity ?? 100,
      scale: choice.scale ?? 1,
      offsetX: choice.offsetX ?? 0,
      offsetY: choice.offsetY ?? 0,
    },
  }
}

/** The theme a slide renders with once its own background is applied. */
export function withSlideBackground(
  theme: BroadcastTheme,
  verse: VerseRenderData | null | undefined
): BroadcastTheme {
  const background = verse?.slideBackground
  return background ? { ...theme, background } : theme
}
