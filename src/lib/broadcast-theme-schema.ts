import type { BroadcastTheme } from "@/types"

type JsonObject = Record<string, unknown>

const THEME_SECTIONS = [
  "bible",
  "songs",
  "announcements",
  "presentation",
] as const
const OUTPUT_MODES = ["standard", "lower-third", "ticker"] as const
const BACKGROUND_TYPES = ["solid", "gradient", "image", "transparent"] as const
const GRADIENT_TYPES = ["linear", "radial"] as const
const MEDIA_TYPES = ["image", "video"] as const
const IMAGE_FITS = ["cover", "contain", "stretch"] as const
const HORIZONTAL_ALIGNS = ["left", "center", "right", "justify"] as const
const VERTICAL_ALIGNS = ["top", "middle", "bottom"] as const
const TEXT_TRANSFORMS = [
  "none",
  "uppercase",
  "lowercase",
  "capitalize",
] as const
const TEXT_DECORATIONS = ["none", "underline", "line-through"] as const
const REFERENCE_POSITIONS = ["above", "below", "inline"] as const
const LAYOUT_ANCHORS = [
  "center",
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const
const TEXT_ALIGNS = ["left", "center", "right"] as const
const TRANSITION_TYPES = ["fade", "slide", "scale", "none"] as const
const TRANSITION_EASINGS = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const
const TRANSITION_DIRECTIONS = ["up", "down", "left", "right"] as const

export function parseBroadcastTheme(value: unknown): BroadcastTheme | null {
  try {
    return decodeBroadcastTheme(value)
  } catch {
    return null
  }
}

export function decodeBroadcastTheme(value: unknown): BroadcastTheme {
  const theme = objectValue(value, "theme")
  const background = objectValue(theme.background, "theme.background")
  const textBox = objectValue(theme.textBox, "theme.textBox")
  const verseText = objectValue(theme.verseText, "theme.verseText")
  const verseNumbers = objectValue(theme.verseNumbers, "theme.verseNumbers")
  const reference = objectValue(theme.reference, "theme.reference")
  const layout = objectValue(theme.layout, "theme.layout")
  const transition = objectValue(theme.transition, "theme.transition")
  const resolution = objectValue(theme.resolution, "theme.resolution")

  return {
    id: stringValue(theme.id, "theme.id"),
    name: stringValue(theme.name, "theme.name"),
    builtin: booleanValue(theme.builtin, "theme.builtin"),
    pinned: booleanValue(theme.pinned, "theme.pinned"),
    section: optionalEnumValue(theme.section, THEME_SECTIONS, "theme.section"),
    outputMode: optionalEnumValue(
      theme.outputMode,
      OUTPUT_MODES,
      "theme.outputMode"
    ),
    sortOrder: optionalNumberValue(theme.sortOrder, "theme.sortOrder"),
    createdAt: numberValue(theme.createdAt, "theme.createdAt", 0),
    updatedAt: numberValue(theme.updatedAt, "theme.updatedAt", 0),
    resolution: {
      width: integerValue(resolution.width, "theme.resolution.width", 1, 7680),
      height: integerValue(
        resolution.height,
        "theme.resolution.height",
        1,
        4320
      ),
    },
    background: {
      type: enumValue(
        background.type,
        BACKGROUND_TYPES,
        "theme.background.type"
      ),
      color: stringValue(background.color, "theme.background.color"),
      gradient: parseGradient(background.gradient),
      image: parseBackgroundImage(background.image),
    },
    textBox: {
      enabled: booleanValue(textBox.enabled, "theme.textBox.enabled"),
      color: stringValue(textBox.color, "theme.textBox.color"),
      opacity: numberValue(textBox.opacity, "theme.textBox.opacity", 0, 1),
      borderRadius: numberValue(
        textBox.borderRadius,
        "theme.textBox.borderRadius",
        0,
        1000
      ),
      padding: numberValue(textBox.padding, "theme.textBox.padding", 0, 1000),
    },
    verseText: {
      fontFamily: stringValue(
        verseText.fontFamily,
        "theme.verseText.fontFamily"
      ),
      fontSize: numberValue(
        verseText.fontSize,
        "theme.verseText.fontSize",
        1,
        1000
      ),
      fontWeight: numberValue(
        verseText.fontWeight,
        "theme.verseText.fontWeight",
        1,
        1000
      ),
      color: stringValue(verseText.color, "theme.verseText.color"),
      horizontalAlign: optionalEnumValue(
        verseText.horizontalAlign,
        HORIZONTAL_ALIGNS,
        "theme.verseText.horizontalAlign"
      ),
      verticalAlign: optionalEnumValue(
        verseText.verticalAlign,
        VERTICAL_ALIGNS,
        "theme.verseText.verticalAlign"
      ),
      textTransform: optionalEnumValue(
        verseText.textTransform,
        TEXT_TRANSFORMS,
        "theme.verseText.textTransform"
      ),
      textDecoration: optionalEnumValue(
        verseText.textDecoration,
        TEXT_DECORATIONS,
        "theme.verseText.textDecoration"
      ),
      lineHeight: numberValue(
        verseText.lineHeight,
        "theme.verseText.lineHeight",
        0.1,
        10
      ),
      letterSpacing: numberValue(
        verseText.letterSpacing,
        "theme.verseText.letterSpacing",
        -100,
        100
      ),
      shadow: parseShadow(verseText.shadow),
      outline: parseOutline(verseText.outline),
    },
    verseNumbers: {
      visible: booleanValue(verseNumbers.visible, "theme.verseNumbers.visible"),
      fontSize: numberValue(
        verseNumbers.fontSize,
        "theme.verseNumbers.fontSize",
        1,
        1000
      ),
      color: stringValue(verseNumbers.color, "theme.verseNumbers.color"),
      superscript: booleanValue(
        verseNumbers.superscript,
        "theme.verseNumbers.superscript"
      ),
    },
    reference: {
      fontFamily: stringValue(
        reference.fontFamily,
        "theme.reference.fontFamily"
      ),
      fontSize: numberValue(
        reference.fontSize,
        "theme.reference.fontSize",
        1,
        1000
      ),
      fontWeight: numberValue(
        reference.fontWeight,
        "theme.reference.fontWeight",
        1,
        1000
      ),
      color: stringValue(reference.color, "theme.reference.color"),
      horizontalAlign: optionalEnumValue(
        reference.horizontalAlign,
        HORIZONTAL_ALIGNS,
        "theme.reference.horizontalAlign"
      ),
      verticalAlign: optionalEnumValue(
        reference.verticalAlign,
        VERTICAL_ALIGNS,
        "theme.reference.verticalAlign"
      ),
      textTransform: optionalEnumValue(
        reference.textTransform,
        TEXT_TRANSFORMS,
        "theme.reference.textTransform"
      ),
      textDecoration: optionalEnumValue(
        reference.textDecoration,
        TEXT_DECORATIONS,
        "theme.reference.textDecoration"
      ),
      uppercase: booleanValue(reference.uppercase, "theme.reference.uppercase"),
      letterSpacing: numberValue(
        reference.letterSpacing,
        "theme.reference.letterSpacing",
        -100,
        100
      ),
      position: enumValue(
        reference.position,
        REFERENCE_POSITIONS,
        "theme.reference.position"
      ),
    },
    layout: {
      anchor: enumValue(layout.anchor, LAYOUT_ANCHORS, "theme.layout.anchor"),
      offsetX: numberValue(
        layout.offsetX,
        "theme.layout.offsetX",
        -10_000,
        10_000
      ),
      offsetY: numberValue(
        layout.offsetY,
        "theme.layout.offsetY",
        -10_000,
        10_000
      ),
      padding: parsePadding(layout.padding),
      textAlign: enumValue(
        layout.textAlign,
        TEXT_ALIGNS,
        "theme.layout.textAlign"
      ),
      backgroundWidth: numberValue(
        layout.backgroundWidth,
        "theme.layout.backgroundWidth",
        0,
        10_000
      ),
      backgroundHeight: numberValue(
        layout.backgroundHeight,
        "theme.layout.backgroundHeight",
        0,
        10_000
      ),
      textAreaWidth: numberValue(
        layout.textAreaWidth,
        "theme.layout.textAreaWidth",
        0,
        10_000
      ),
      textAreaHeight: numberValue(
        layout.textAreaHeight,
        "theme.layout.textAreaHeight",
        0,
        10_000
      ),
      referenceGap: optionalNumberValue(
        layout.referenceGap,
        "theme.layout.referenceGap",
        -1000,
        1000
      ),
    },
    transition: {
      type: enumValue(
        transition.type,
        TRANSITION_TYPES,
        "theme.transition.type"
      ),
      duration: numberValue(
        transition.duration,
        "theme.transition.duration",
        0,
        60_000
      ),
      easing: enumValue(
        transition.easing,
        TRANSITION_EASINGS,
        "theme.transition.easing"
      ),
      direction: enumValue(
        transition.direction,
        TRANSITION_DIRECTIONS,
        "theme.transition.direction"
      ),
    },
  }
}

function parseGradient(
  value: unknown
): BroadcastTheme["background"]["gradient"] {
  if (value === null) return null
  const gradient = objectValue(value, "theme.background.gradient")
  if (!Array.isArray(gradient.stops) || gradient.stops.length < 2) {
    throw new Error("theme.background.gradient.stops must contain two stops")
  }
  return {
    type: enumValue(
      gradient.type,
      GRADIENT_TYPES,
      "theme.background.gradient.type"
    ),
    angle: numberValue(
      gradient.angle,
      "theme.background.gradient.angle",
      -3600,
      3600
    ),
    stops: gradient.stops.map((value, index) => {
      const stop = objectValue(
        value,
        `theme.background.gradient.stops.${index}`
      )
      return {
        color: stringValue(
          stop.color,
          `theme.background.gradient.stops.${index}.color`
        ),
        position: numberValue(
          stop.position,
          `theme.background.gradient.stops.${index}.position`,
          0,
          1
        ),
      }
    }),
  }
}

function parseBackgroundImage(
  value: unknown
): BroadcastTheme["background"]["image"] {
  if (value === null) return null
  const image = objectValue(value, "theme.background.image")
  return {
    url: stringValue(image.url, "theme.background.image.url"),
    mediaType: optionalEnumValue(
      image.mediaType,
      MEDIA_TYPES,
      "theme.background.image.mediaType"
    ),
    playbackStartedAt: optionalNumberValue(
      image.playbackStartedAt,
      "theme.background.image.playbackStartedAt",
      0
    ),
    fit: enumValue(image.fit, IMAGE_FITS, "theme.background.image.fit"),
    blur: numberValue(image.blur, "theme.background.image.blur", 0, 1000),
    brightness: numberValue(
      image.brightness,
      "theme.background.image.brightness",
      0,
      1000
    ),
    tint:
      image.tint === null
        ? null
        : stringValue(image.tint, "theme.background.image.tint"),
  }
}

function parseShadow(value: unknown): BroadcastTheme["verseText"]["shadow"] {
  if (value === null) return null
  const shadow = objectValue(value, "theme.verseText.shadow")
  return {
    color: stringValue(shadow.color, "theme.verseText.shadow.color"),
    blur: numberValue(shadow.blur, "theme.verseText.shadow.blur", 0, 1000),
    x: numberValue(shadow.x, "theme.verseText.shadow.x", -1000, 1000),
    y: numberValue(shadow.y, "theme.verseText.shadow.y", -1000, 1000),
  }
}

function parseOutline(value: unknown): BroadcastTheme["verseText"]["outline"] {
  if (value === null) return null
  const outline = objectValue(value, "theme.verseText.outline")
  return {
    color: stringValue(outline.color, "theme.verseText.outline.color"),
    width: numberValue(outline.width, "theme.verseText.outline.width", 0, 1000),
  }
}

function parsePadding(value: unknown): BroadcastTheme["layout"]["padding"] {
  const padding = objectValue(value, "theme.layout.padding")
  return {
    top: numberValue(padding.top, "theme.layout.padding.top", 0, 10_000),
    right: numberValue(padding.right, "theme.layout.padding.right", 0, 10_000),
    bottom: numberValue(
      padding.bottom,
      "theme.layout.padding.bottom",
      0,
      10_000
    ),
    left: numberValue(padding.left, "theme.layout.padding.left", 0, 10_000),
  }
}

function objectValue(value: unknown, path: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
  return value as JsonObject
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`)
  }
  return value
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`)
  return value
}

function numberValue(
  value: unknown,
  path: string,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${path} must be a finite number`)
  }
  return value
}

function optionalNumberValue(
  value: unknown,
  path: string,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY
): number | undefined {
  return value === undefined
    ? undefined
    : numberValue(value, path, minimum, maximum)
}

function integerValue(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number
): number {
  const parsed = numberValue(value, path, minimum, maximum)
  if (!Number.isInteger(parsed)) throw new Error(`${path} must be an integer`)
  return parsed
}

function enumValue<const T extends string>(
  value: unknown,
  values: readonly T[],
  path: string
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${path} has an unsupported value`)
  }
  return value as T
}

function optionalEnumValue<const T extends string>(
  value: unknown,
  values: readonly T[],
  path: string
): T | undefined {
  return value === undefined ? undefined : enumValue(value, values, path)
}
