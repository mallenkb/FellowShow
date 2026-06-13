import type { BroadcastTheme } from "@/types/broadcast"

const BUILTIN_PRESENTATION_BACKGROUND_LIGHT = "#101084"
const BUILTIN_PRESENTATION_BACKGROUND_DARK = "#323294"
export const BROADCAST_OVERLAY_PREVIEW_IMAGE = "/broadcast-previews/preacher-stage-unsplash-phil-hearing.jpg"
export const BIBLE_VERSE_PREVIEW_IMAGE = "/broadcast-previews/full-background.jpg"
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

  if (typeof window.matchMedia === "function" && window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return BUILTIN_PRESENTATION_BACKGROUND_DARK
  }

  return BUILTIN_PRESENTATION_BACKGROUND_LIGHT
}

const baseTheme: Omit<BroadcastTheme, "id" | "name" | "background" | "verseText" | "reference" | "layout" | "transition" | "textBox"> = {
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
    fontFamily: "Source Serif 4 Variable",
    fontSize: 72,
    fontWeight: 400,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "top",
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
    fontFamily: "Geist Variable",
    fontSize: 48,
    fontWeight: 500,
    color: "#F1E600",
    horizontalAlign: "center",
    verticalAlign: "top",
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
    padding: { top: 60, right: 80, bottom: 60, left: 80 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 80,
    textAreaHeight: 80,
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
    fontFamily: "Geist Variable",
    fontSize: 68,
    fontWeight: 400,
    color: "#1a1a1a",
    horizontalAlign: "left",
    verticalAlign: "top",
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
    fontFamily: "Geist Variable",
    fontSize: 45,
    fontWeight: 500,
    color: "#666666",
    horizontalAlign: "left",
    verticalAlign: "top",
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
    padding: { top: 60, right: 80, bottom: 60, left: 80 },
    textAlign: "left",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 80,
    textAreaHeight: 80,
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
    fontFamily: "Geist Variable",
    fontSize: 64,
    fontWeight: 500,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "top",
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
    fontFamily: "Geist Variable",
    fontSize: 43,
    fontWeight: 600,
    color: "#fbbf24",
    horizontalAlign: "center",
    verticalAlign: "top",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 1,
    position: "below",
  },
  layout: {
    anchor: "bottom-center",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 40, right: 60, bottom: 40, left: 60 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 100,
    textAreaHeight: 40,
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
    fontFamily: "Source Serif 4 Variable",
    fontSize: 70,
    fontWeight: 500,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "top",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.45,
    letterSpacing: 0,
    shadow: { color: "rgba(0,0,0,0.78)", blur: 10, x: 0, y: 3 },
    outline: null,
  },
  verseNumbers: {
    visible: true,
    fontSize: 18,
    color: "#f4c95d",
    superscript: true,
  },
  reference: {
    fontFamily: "Geist Variable",
    fontSize: 42,
    fontWeight: 600,
    color: "#f4c95d",
    horizontalAlign: "center",
    verticalAlign: "top",
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
    padding: { top: 48, right: 72, bottom: 48, left: 72 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 78,
    textAreaHeight: 44,
    referenceGap: 22,
  },
  transition: {
    type: "fade",
    duration: 300,
    easing: "ease-in-out",
    direction: "up",
  },
}

const LOWER_THIRD_OVERLAY: BroadcastTheme = {
  ...baseTheme,
  pinned: true,
  id: "builtin-lower-third-overlay",
  name: "Lower Third Overlay",
  outputMode: "lower-third",
  background: {
    type: "transparent",
    color: "#000000",
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
    fontFamily: "Geist Variable",
    fontSize: 46,
    fontWeight: 600,
    color: "#ffffff",
    horizontalAlign: "left",
    verticalAlign: "bottom",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.35,
    letterSpacing: 0,
    shadow: { color: "rgba(0,0,0,0.75)", blur: 8, x: 0, y: 2 },
    outline: null,
  },
  verseNumbers: {
    visible: false,
    fontSize: 16,
    color: "#ffffff",
    superscript: true,
  },
  reference: {
    fontFamily: "Geist Variable",
    fontSize: 28,
    fontWeight: 600,
    color: "#93c5fd",
    horizontalAlign: "left",
    verticalAlign: "bottom",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 0,
    position: "below",
  },
  layout: {
    anchor: "bottom-left",
    offsetX: 128,
    offsetY: -96,
    padding: { top: 24, right: 34, bottom: 24, left: 34 },
    textAlign: "left",
    backgroundWidth: 50,
    backgroundHeight: 22,
    textAreaWidth: 50,
    textAreaHeight: 22,
    referenceGap: 12,
  },
  transition: {
    type: "fade",
    duration: 250,
    easing: "ease-out",
    direction: "up",
  },
}

export const BUILTIN_THEMES: BroadcastTheme[] = [
  CLASSIC_DARK,
  MODERN_LIGHT,
  BROADCAST_OVERLAY,
  BIBLE_VERSE_PREVIEW,
  LOWER_THIRD_OVERLAY,
]
