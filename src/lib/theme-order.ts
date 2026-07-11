import type { BroadcastTheme, BroadcastThemeSection } from "@/types"

function themeSectionScore(
  theme: BroadcastTheme,
  section: BroadcastThemeSection
): number {
  if (section === "bible") {
    let score = 0
    if (theme.layout.anchor === "center") score += 4
    if (theme.layout.textAreaHeight >= 40) score += 2
    if (theme.background.type === "image") score += 1
    if (theme.reference.position === "below") score += 1
    return score
  }

  let score = 0
  if (theme.layout.anchor.startsWith("bottom")) score += 3
  if (theme.reference.position === "below") score += 2
  if (theme.textBox.enabled) score += 1
  if (theme.background.type === "image") score += 1
  return score
}

export function sortThemesForSection(
  themes: BroadcastTheme[],
  section: BroadcastThemeSection,
  activeThemeId: string
): BroadcastTheme[] {
  return [...themes].sort((a, b) => {
    if (a.sortOrder !== undefined || b.sortOrder !== undefined) {
      return (
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
      )
    }

    if (a.id === activeThemeId && b.id !== activeThemeId) return -1
    if (b.id === activeThemeId && a.id !== activeThemeId) return 1

    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1

    const relevance =
      themeSectionScore(b, section) - themeSectionScore(a, section)
    if (relevance !== 0) return relevance

    const updated = b.updatedAt - a.updatedAt
    if (updated !== 0) return updated

    return a.name.localeCompare(b.name)
  })
}
