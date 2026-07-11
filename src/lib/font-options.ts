type BroadcastFontCategory = "sans" | "serif" | "handwritten" | "mono"

export interface BroadcastFontOption {
  value: string
  label: string
  category: BroadcastFontCategory
}

export const DEFAULT_PRESENTATION_FONT_FAMILY = "Inter Variable"

export const BROADCAST_FONT_FAMILIES: BroadcastFontOption[] = [
  { value: "Inter Variable", label: "Inter", category: "sans" },
  { value: "Geist Variable", label: "Geist", category: "sans" },
  { value: "Helvetica", label: "Helvetica", category: "sans" },
  { value: "Arial", label: "Arial", category: "sans" },
  { value: "Verdana", label: "Verdana", category: "sans" },
  { value: "Trebuchet MS", label: "Trebuchet MS", category: "sans" },
  {
    value: "Source Serif 4 Variable",
    label: "Source Serif 4",
    category: "serif",
  },
  { value: "Georgia", label: "Georgia", category: "serif" },
  { value: "Times New Roman", label: "Times New Roman", category: "serif" },
  { value: "Palatino", label: "Palatino", category: "serif" },
  { value: "Baskerville", label: "Baskerville", category: "serif" },
  {
    value: "Brush Script MT",
    label: "Brush Script MT",
    category: "handwritten",
  },
  { value: "Comic Sans MS", label: "Comic Sans MS", category: "handwritten" },
  { value: "Marker Felt", label: "Marker Felt", category: "handwritten" },
  { value: "Bradley Hand", label: "Bradley Hand", category: "handwritten" },
  { value: "Geist Mono", label: "Geist Mono", category: "mono" },
  { value: "Courier New", label: "Courier New", category: "mono" },
]

export function getFontFallback(fontFamily: string): string {
  const category = BROADCAST_FONT_FAMILIES.find(
    (font) => font.value === fontFamily
  )?.category
  if (category === "serif") return "serif"
  if (category === "mono") return "monospace"
  if (category === "handwritten") return "cursive"
  return "sans-serif"
}
