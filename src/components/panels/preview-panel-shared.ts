import type { BroadcastThemeSection, VerseRenderData } from "@/types"

export type ThemeAwareMode =
  | "book"
  | "context"
  | "songs"
  | "announcements"
  | "presentation"
  | "timer"
  | "on-display"

export const THEME_SECTION_LABELS: Record<BroadcastThemeSection, string> = {
  bible: "Scriptures",
  songs: "Songs",
  announcements: "Announcements",
  presentation: "Presentation",
}

export function sectionFromMode(mode: ThemeAwareMode): BroadcastThemeSection {
  if (mode === "presentation") return "presentation"
  if (mode === "songs") return "songs"
  if (mode === "announcements") return "announcements"
  return "bible"
}

export const THEME_THUMBNAIL_BY_SECTION: Record<
  BroadcastThemeSection,
  VerseRenderData
> = {
  bible: {
    reference: "John 3:16",
    themeSection: "bible",
    segments: [{ text: "Sample Verse" }],
  },
  songs: {
    reference: "",
    themeSection: "songs",
    referenceMode: "lyric-footer",
    segments: [{ text: "Sample song lyric" }],
  },
  announcements: {
    reference: "Announcements",
    themeSection: "announcements",
    segments: [{ verseNumber: 1, text: "Sample announcement" }],
  },
  presentation: {
    reference: "Presentation Slide",
    themeSection: "presentation",
    segments: [],
    presentationImage: {
      url: "/broadcast-previews/full-background.jpg",
      name: "Sample presentation",
      fit: "cover",
    },
  },
}
