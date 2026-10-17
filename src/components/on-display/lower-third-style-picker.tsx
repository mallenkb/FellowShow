import { useDeferredValue } from "react"
import { cn } from "@/lib/utils"
import {
  LOWER_THIRD_STYLE_OPTIONS,
  type BroadcastOverlayPayload,
} from "@/types/overlays"
import type { LowerThirdStyle } from "@/types"
import {
  LOWER_THIRD_DESIGN_OPTIONS,
  isLowerThirdDesignStyle,
} from "@/types/lower-third-designs"
import { LowerThirdStyleThumbnail } from "./lower-third-style-thumbnail"

const STYLE_OPTIONS = [
  ...LOWER_THIRD_DESIGN_OPTIONS,
  ...LOWER_THIRD_STYLE_OPTIONS.filter(
    (option) => !isLowerThirdDesignStyle(option.value)
  ),
]

export function LowerThirdStylePicker({
  value,
  graphic,
  onChange,
}: {
  value: LowerThirdStyle
  graphic: NonNullable<BroadcastOverlayPayload["lowerThird"]>
  onChange: (style: LowerThirdStyle) => void
}) {
  const content = useDeferredValue(graphic)
  return (
    <div className="grid gap-2">
      <p id="lower-third-style-label" className="text-xs font-medium">
        Layout style
      </p>
      <div
        role="group"
        aria-labelledby="lower-third-style-label"
        className="grid max-h-[clamp(8rem,22dvh,18rem)] [scrollbar-width:thin] auto-rows-max grid-cols-2 gap-2 overflow-y-auto p-0.5"
      >
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            aria-label={option.label}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-28 min-w-0 overflow-hidden rounded-lg border text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              value === option.value
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border hover:border-muted-foreground"
            )}
          >
            <LowerThirdStyleThumbnail
              graphic={content}
              style={option.value}
              backgroundColor={option.defaultBackgroundColor}
              textColor={option.defaultTextColor}
            />
            <span className="block truncate px-2 py-1.5 text-[0.6875rem] font-medium">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
