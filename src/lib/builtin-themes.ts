import { DEFAULT_PRESENTATION_FONT_FAMILY } from "@/lib/font-options"
import type { BroadcastTheme } from "@/types/broadcast"

const BUILTIN_PRESENTATION_BACKGROUND_LIGHT = "#101084"
const BUILTIN_PRESENTATION_BACKGROUND_DARK = "#323294"
const BROADCAST_OVERLAY_PREVIEW_IMAGE =
  "/broadcast-previews/preacher-stage-unsplash-phil-hearing.jpg"
const BIBLE_VERSE_PREVIEW_IMAGE = "/broadcast-previews/full-background.jpg"
const SONG_PAINT_SWEEPS_IMAGE = "/broadcast-previews/paint-sweeps-song.jpg"
const SONG_THEME_IMAGE_DEFINITIONS = [
  {
    id: "builtin-song-mountains",
    name: "Purple Mountains",
    url: "/broadcast-previews/song-mountains.jpg",
    color: "#1b1422",
    brightness: 92,
    tint: "rgba(20, 4, 24, 0.18)",
  },
  {
    id: "builtin-song-water",
    name: "Blue Water",
    url: "/broadcast-previews/song-water.jpg",
    color: "#07355c",
    brightness: 78,
    tint: "rgba(0, 17, 46, 0.34)",
  },
  {
    id: "builtin-song-ocean",
    name: "Deep Ocean",
    url: "/broadcast-previews/song-ocean.jpg",
    color: "#03151b",
    brightness: 92,
    tint: "rgba(0, 0, 0, 0.16)",
  },
  {
    id: "builtin-song-black-texture",
    name: "Black Texture",
    url: "/broadcast-previews/song-black-texture.jpg",
    color: "#050505",
    brightness: 82,
    tint: "rgba(0, 0, 0, 0.12)",
  },
] as const
const SONG_PAINT_SWEEPS_THEME_ID = "builtin-song-paint-sweeps"
export const DEFAULT_SONG_THEME_ID = "builtin-song-ocean"
const THEME_STORAGE_KEY = "theme"
const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

export function getBuiltinPresentationBackground(): string {
  if (typeof window === "undefined") {
    return BUILTIN_PRESENTATION_BACKGROUND_LIGHT
  }

  let preferredTheme: string | null = null
  try {
    preferredTheme = window.localStorage?.getItem(THEME_STORAGE_KEY) ?? null
  } catch {
    preferredTheme = null
  }

  if (preferredTheme === "dark") return BUILTIN_PRESENTATION_BACKGROUND_DARK
  if (preferredTheme === "light") return BUILTIN_PRESENTATION_BACKGROUND_LIGHT

  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia(COLOR_SCHEME_QUERY).matches
  ) {
    return BUILTIN_PRESENTATION_BACKGROUND_DARK
  }

  return BUILTIN_PRESENTATION_BACKGROUND_LIGHT
}

const baseTheme: Omit<
  BroadcastTheme,
  | "id"
  | "name"
  | "background"
  | "verseText"
  | "reference"
  | "layout"
  | "transition"
  | "textBox"
> = {
  builtin: true,
  pinned: false,
  createdAt: 0,
  updatedAt: 0,
  resolution: { width: 1920, height: 1080 },
  verseNumbers: {
    visible: true,
    fontSize: 14,
    color: "#ffffff",
    superscript: true,
  },
}

const CLASSIC_DARK: BroadcastTheme = {
  ...baseTheme,
  pinned: true,
  id: "builtin-classic-dark",
  name: "Classic Dark",
  background: {
    type: "solid",
    color: getBuiltinPresentationBackground(),
    gradient: null,
    image: null,
  },
  textBox: {
    enabled: false,
    color: "#000000",
    opacity: 0,
    borderRadius: 0,
    padding: 0,
  },
  verseText: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 72,
    fontWeight: 400,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.5,
    letterSpacing: 0,
    shadow: null,
    outline: null,
  },
  verseNumbers: {
    visible: true,
    fontSize: 20,
    color: "#F1E600",
    superscript: true,
  },
  reference: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 48,
    fontWeight: 500,
    color: "#F1E600",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    uppercase: true,
    letterSpacing: 2,
    position: "above",
  },
  layout: {
    anchor: "center",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 40, right: 56, bottom: 40, left: 56 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 92,
    textAreaHeight: 88,
    referenceGap: 32,
  },
  transition: {
    type: "fade",
    duration: 500,
    easing: "ease-in-out",
    direction: "up",
  },
}

const MODERN_LIGHT: BroadcastTheme = {
  ...baseTheme,
  pinned: true,
  id: "builtin-modern-light",
  name: "Modern Light",
  background: {
    type: "solid",
    color: "#f5f5f0",
    gradient: null,
    image: null,
  },
  textBox: {
    enabled: false,
    color: "#000000",
    opacity: 0,
    borderRadius: 0,
    padding: 0,
  },
  verseText: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 68,
    fontWeight: 400,
    color: "#1a1a1a",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.6,
    letterSpacing: 0,
    shadow: null,
    outline: null,
  },
  verseNumbers: {
    visible: true,
    fontSize: 18,
    color: "#666666",
    superscript: true,
  },
  reference: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 45,
    fontWeight: 500,
    color: "#666666",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 0,
    position: "above",
  },
  layout: {
    anchor: "center",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 40, right: 56, bottom: 40, left: 56 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 92,
    textAreaHeight: 88,
    referenceGap: 30,
  },
  transition: {
    type: "fade",
    duration: 400,
    easing: "ease-in-out",
    direction: "up",
  },
}

const BROADCAST_OVERLAY: BroadcastTheme = {
  ...baseTheme,
  pinned: true,
  id: "builtin-broadcast-overlay",
  name: "Broadcast Overlay",
  background: {
    type: "image",
    color: "#000000",
    gradient: null,
    image: {
      url: BROADCAST_OVERLAY_PREVIEW_IMAGE,
      fit: "cover",
      blur: 0,
      brightness: 72,
      tint: "rgba(0,0,0,0.18)",
    },
  },
  textBox: {
    enabled: true,
    color: "#000000",
    opacity: 0.7,
    borderRadius: 12,
    padding: 24,
  },
  verseText: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 64,
    fontWeight: 500,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.5,
    letterSpacing: 0,
    shadow: { color: "rgba(0,0,0,0.8)", blur: 8, x: 0, y: 2 },
    outline: null,
  },
  verseNumbers: {
    visible: true,
    fontSize: 18,
    color: "#fbbf24",
    superscript: true,
  },
  reference: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 43,
    fontWeight: 600,
    color: "#fbbf24",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 1,
    position: "below",
  },
  layout: {
    anchor: "center",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 32, right: 48, bottom: 32, left: 48 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 94,
    textAreaHeight: 88,
    referenceGap: 24,
  },
  transition: {
    type: "fade",
    duration: 300,
    easing: "ease-in-out",
    direction: "up",
  },
}

const BIBLE_VERSE_PREVIEW: BroadcastTheme = {
  ...baseTheme,
  pinned: true,
  id: "builtin-bible-verse-preview",
  name: "Bible Verse Preview",
  background: {
    type: "image",
    color: "#091b3f",
    gradient: null,
    image: {
      url: BIBLE_VERSE_PREVIEW_IMAGE,
      fit: "cover",
      blur: 0,
      brightness: 82,
      tint: "rgba(4,12,32,0.28)",
    },
  },
  textBox: {
    enabled: false,
    color: "#000000",
    opacity: 0,
    borderRadius: 0,
    padding: 0,
  },
  verseText: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 96,
    fontWeight: 500,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.45,
    letterSpacing: 0,
    shadow: { color: "rgba(0,0,0,0.78)", blur: 10, x: 0, y: 3 },
    outline: null,
  },
  verseNumbers: {
    visible: true,
    fontSize: 42,
    color: "#f4c95d",
    superscript: true,
  },
  reference: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 37,
    fontWeight: 600,
    color: "#f4c95d",
    horizontalAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 1,
    position: "below",
  },
  layout: {
    anchor: "center",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 54, right: 96, bottom: 54, left: 96 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 100,
    textAreaHeight: 100,
    referenceGap: 44,
  },
  transition: {
    type: "fade",
    duration: 300,
    easing: "ease-in-out",
    direction: "up",
  },
}

const SONG_PAINT_SWEEPS: BroadcastTheme = {
  ...BIBLE_VERSE_PREVIEW,
  id: SONG_PAINT_SWEEPS_THEME_ID,
  name: "Paint Sweeps Songs",
  section: "songs",
  pinned: true,
  background: {
    type: "image",
    color: "#08131d",
    gradient: null,
    image: {
      url: SONG_PAINT_SWEEPS_IMAGE,
      mediaType: "image",
      fit: "cover",
      blur: 0,
      brightness: 100,
      tint: "rgba(0, 0, 0, 0.16)",
    },
  },
}

const SONG_IMAGE_THEMES: BroadcastTheme[] = SONG_THEME_IMAGE_DEFINITIONS.map(
  (definition) => ({
    ...BIBLE_VERSE_PREVIEW,
    id: definition.id,
    name: definition.name,
    section: "songs",
    pinned: true,
    background: {
      type: "image",
      color: definition.color,
      gradient: null,
      image: {
        url: definition.url,
        mediaType: "image",
        fit: "cover",
        blur: 0,
        brightness: definition.brightness,
        tint: definition.tint,
      },
    },
  })
)

const PRESENTATION_TICKER: BroadcastTheme = {
  ...baseTheme,
  pinned: true,
  id: "builtin-presentation-ticker",
  name: "Presentation Ticker",
  outputMode: "ticker",
  background: {
    type: "image",
    color: "#000000",
    gradient: null,
    image: {
      url: BROADCAST_OVERLAY_PREVIEW_IMAGE,
      fit: "cover",
      blur: 0,
      brightness: 72,
      tint: "rgba(0,21,54,0.26)",
    },
  },
  textBox: {
    enabled: true,
    color: "#ffffff",
    opacity: 1,
    borderRadius: 0,
    padding: 0,
  },
  verseText: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 46,
    fontWeight: 800,
    color: "#062b57",
    horizontalAlign: "left",
    verticalAlign: "middle",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.2,
    letterSpacing: 0,
    shadow: null,
    outline: null,
  },
  verseNumbers: {
    visible: false,
    fontSize: 16,
    color: "#f8fafc",
    superscript: true,
  },
  reference: {
    fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
    fontSize: 46,
    fontWeight: 800,
    color: "#ffffff",
    horizontalAlign: "left",
    verticalAlign: "top",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 0,
    position: "below",
  },
  layout: {
    anchor: "bottom-left",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    textAlign: "left",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 100,
    textAreaHeight: 10,
    referenceGap: 0,
  },
  transition: {
    type: "fade",
    duration: 300,
    easing: "ease-in-out",
    direction: "up",
  },
}

export const BUILTIN_THEMES: BroadcastTheme[] = [
  CLASSIC_DARK,
  MODERN_LIGHT,
  BROADCAST_OVERLAY,
  BIBLE_VERSE_PREVIEW,
  SONG_PAINT_SWEEPS,
  ...SONG_IMAGE_THEMES,
  PRESENTATION_TICKER,
]
