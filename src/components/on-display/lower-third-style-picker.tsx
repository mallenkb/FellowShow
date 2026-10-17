import { useDeferredValue } from "react"
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
import { OverlayDesignPicker } from "./overlay-design-picker"

const STYLE_OPTIONS = [
  ...LOWER_THIRD_DESIGN_OPTIONS,
  ...LOWER_THIRD_STYLE_OPTIONS.filter(
    (option) => !isLowerThirdDesignStyle(option.value)
  ),
]

/** A dropdown of lower third designs, each with a live thumbnail. */
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
    <OverlayDesignPicker<LowerThirdStyle>
      label="Design"
      value={value}
      options={STYLE_OPTIONS}
      onChange={onChange}
      renderThumbnail={(style) => {
        const option = STYLE_OPTIONS.find((item) => item.value === style)
        return (
          <LowerThirdStyleThumbnail
            graphic={content}
            style={style}
            backgroundColor={
              style === value
                ? content.backgroundColor
                : (option?.defaultBackgroundColor ?? content.backgroundColor)
            }
            textColor={
              style === value
                ? content.textColor
                : (option?.defaultTextColor ?? content.textColor)
            }
          />
        )
      }}
    />
  )
}
