import { OverlayColorField } from "./overlay-fields"
import { SliderField } from "@/components/ui/slider-field"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  LOWER_THIRD_DESIGN_OPTIONS,
  isLowerThirdDesignStyle,
} from "@/types/lower-third-designs"
import type { LowerThirdDraft } from "./lower-third-overlay-section"
import { LowerThirdImageField } from "./lower-third-image-field"
import type { LowerThirdLogoPosition } from "@/types"

const LOGO_POSITIONS: readonly LowerThirdLogoPosition[] = ["left", "right"]

export function LowerThirdAppearanceFields({
  value,
  onChange,
}: {
  value: LowerThirdDraft
  onChange: (updates: Partial<LowerThirdDraft>) => void
}) {
  const defaultAccent =
    LOWER_THIRD_DESIGN_OPTIONS.find((option) => option.value === value.style)
      ?.accent ?? "#2563eb"
  const design = value.style ? isLowerThirdDesignStyle(value.style) : false
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <OverlayColorField
          label="Background color"
          value={value.backgroundColor}
          onChange={(backgroundColor) => onChange({ backgroundColor })}
        />
        <OverlayColorField
          label="Text color"
          value={value.textColor}
          onChange={(textColor) => onChange({ textColor })}
        />
        <OverlayColorField
          label="Accent color"
          value={value.accentColor ?? defaultAccent}
          onChange={(accentColor) => onChange({ accentColor })}
        />
        {value.accentColor ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ accentColor: undefined })}
          >
            Reset accent
          </Button>
        ) : null}
      </div>
      {value.style === "photo-circle" || value.style === "dark-avatar-blue" ? (
        <LowerThirdImageField
          label="Photo"
          value={value.avatarImageUrl}
          onChange={(avatarImageUrl) => onChange({ avatarImageUrl })}
        />
      ) : null}
      {!design || value.style === "logo-square" ? (
        <LowerThirdImageField
          label="Logo"
          value={value.logoImageUrl}
          onChange={(logoImageUrl) => onChange({ logoImageUrl })}
        />
      ) : null}
      {value.logoImageUrl && (!design || value.style === "logo-square") ? (
        <>
          {!design ? (
            <div className="flex gap-2">
              {LOGO_POSITIONS.map((logoPosition) => (
                <Button
                  key={logoPosition}
                  type="button"
                  size="sm"
                  variant={
                    value.logoPosition === logoPosition ? "default" : "outline"
                  }
                  onClick={() => onChange({ logoPosition })}
                >
                  {logoPosition === "left" ? "Left corner" : "Right corner"}
                </Button>
              ))}
            </div>
          ) : null}
          <SliderField
            label="Logo size"
            min={50}
            max={160}
            value={value.logoSizePercent ?? 100}
            unit="%"
            defaultValue={100}
            onChange={(logoSizePercent) => onChange({ logoSizePercent })}
          />
        </>
      ) : null}
      <SliderField
        label="Graphic size"
        min={60}
        max={150}
        value={value.sizePercent ?? 100}
        unit="%"
        defaultValue={100}
        onChange={(sizePercent) => onChange({ sizePercent })}
      />
      <label className="flex items-center justify-between gap-3 text-xs font-medium">
        Limit maximum width
        <Switch
          checked={value.maxWidthEnabled !== false}
          onCheckedChange={(maxWidthEnabled) => onChange({ maxWidthEnabled })}
        />
      </label>
      {value.maxWidthEnabled !== false ? (
        <SliderField
          label="Maximum width"
          min={25}
          max={90}
          value={value.widthPercent}
          unit="%"
          defaultValue={60}
          onChange={(widthPercent) => onChange({ widthPercent })}
        />
      ) : null}
      <SliderField
        label="Horizontal position"
        min={0}
        max={100}
        value={value.xPercent}
        unit="%"
        defaultValue={
          value.anchor === "bottom-left"
            ? 5
            : value.anchor === "bottom-center"
              ? 50
              : 30
        }
        onChange={(xPercent) => onChange({ xPercent })}
      />
      <SliderField
        label="Vertical position"
        min={0}
        max={100}
        value={value.yPercent}
        unit="%"
        defaultValue={
          value.anchor === "bottom-center"
            ? 91
            : value.anchor === "bottom-left"
              ? 89
              : 82
        }
        onChange={(yPercent) => onChange({ yPercent })}
      />
    </div>
  )
}
