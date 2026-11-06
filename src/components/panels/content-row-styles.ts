export const SELECTED_CONTENT_ROW_CLASS =
  "border-transparent bg-primary/20 hover:bg-primary/25 dark:bg-primary/10 dark:hover:bg-primary/15"
export const SELECTED_LIBRARY_ROW_CLASS = `border-transparent ${SELECTED_CONTENT_ROW_CLASS}`
export const UNSELECTED_LIBRARY_ROW_CLASS =
  "border-border bg-background/30 hover:bg-muted/40"

export function scriptureRowStatusClasses(
  isShowingLive: boolean,
  isShowingPreview: boolean
): string {
  if (isShowingLive) {
    return SELECTED_CONTENT_ROW_CLASS
  }
  if (isShowingPreview) {
    return "border-transparent bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-500/15 dark:hover:bg-blue-500/20"
  }
  return ""
}
