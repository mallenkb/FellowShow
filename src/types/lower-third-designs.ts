/** The fifteen layouts from the lower-third design board, in board order. */
export const LOWER_THIRD_DESIGN_OPTIONS = [
  {
    value: "clean-white",
    label: "01 / Clean white",
    description: "White card with a blue edge",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#0f172a",
    accent: "#2563eb",
  },
  {
    value: "smoked-glass",
    label: "02 / Smoked glass",
    description: "Translucent dark panel with a gold underline",
    defaultBackgroundColor: "#0a0a0f",
    defaultTextColor: "#f8f5ee",
    accent: "#d9b25f",
  },
  {
    value: "stacked-tabs",
    label: "03 / Stacked tabs",
    description: "Dark name tab above a yellow role tab",
    defaultBackgroundColor: "#111827",
    defaultTextColor: "#ffffff",
    accent: "#f1e600",
  },
  {
    value: "photo-circle",
    label: "04 / Photo circle",
    description: "Round photo or initials beside a dark capsule",
    defaultBackgroundColor: "#0f172a",
    defaultTextColor: "#ffffff",
    accent: "#2563eb",
  },
  {
    value: "capsule",
    label: "05 / Capsule",
    description: "White pill with a yellow dot and an inline role",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#111111",
    accent: "#f1e600",
  },
  {
    value: "news-strap",
    label: "06 / News strap",
    description: "Red role tag above a white name panel",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#111111",
    accent: "#dc2626",
  },
  {
    value: "text-only",
    label: "07 / Text only",
    description: "White text and a short yellow rule without a panel",
    defaultBackgroundColor: "#000000",
    defaultTextColor: "#ffffff",
    accent: "#f1e600",
  },
  {
    value: "ivory-serif",
    label: "08 / Ivory serif",
    description: "Warm paper card with serif text and a gold top line",
    defaultBackgroundColor: "#f6f1e7",
    defaultTextColor: "#2b2118",
    accent: "#b08d57",
  },
  {
    value: "angled",
    label: "09 / Angled",
    description: "Violet name panel above an angled white role strip",
    defaultBackgroundColor: "#6d28d9",
    defaultTextColor: "#ffffff",
    accent: "#a21caf",
  },
  {
    value: "thick-accent",
    label: "10 / Thick accent",
    description: "Amber bar beside large white text without a panel",
    defaultBackgroundColor: "#000000",
    defaultTextColor: "#ffffff",
    accent: "#f59e0b",
  },
  {
    value: "split-strip",
    label: "11 / Split strip",
    description: "White name panel above a navy role strip",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#0b1b3a",
    accent: "#38bdf8",
  },
  {
    value: "logo-square",
    label: "12 / Logo square",
    description: "Logo square beside an orange and pink panel",
    defaultBackgroundColor: "#f97316",
    defaultTextColor: "#ffffff",
    accent: "#db2777",
  },
  {
    value: "outline-frame",
    label: "13 / Outline frame",
    description: "White outline with a yellow corner over a translucent panel",
    defaultBackgroundColor: "#000000",
    defaultTextColor: "#ffffff",
    accent: "#f1e600",
  },
  {
    value: "long-rule",
    label: "14 / Long rule",
    description: "Light name with a bold surname and a fading role line",
    defaultBackgroundColor: "#000000",
    defaultTextColor: "#ffffff",
    accent: "#bae6fd",
  },
  {
    value: "centered",
    label: "15 / Centered",
    description: "Centered dark name tab above a yellow role tab",
    defaultBackgroundColor: "#0b0b0f",
    defaultTextColor: "#ffffff",
    accent: "#f1e600",
  },
] as const

export type LowerThirdDesignStyle =
  (typeof LOWER_THIRD_DESIGN_OPTIONS)[number]["value"]

export function isLowerThirdDesignStyle(
  value: string
): value is LowerThirdDesignStyle {
  return LOWER_THIRD_DESIGN_OPTIONS.some((option) => option.value === value)
}
