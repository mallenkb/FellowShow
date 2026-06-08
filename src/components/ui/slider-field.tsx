import { Fader } from "@/components/ui/fader"

/**
 * Labeled slider used across the theme designer. Thin wrapper over {@link Fader}
 * so every slider in the app shares the same inline scrubber design. When
 * `defaultValue` is provided, double-clicking the control resets to it.
 */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  defaultValue,
  format,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  defaultValue?: number
  format?: (value: number) => string
}) {
  return (
    <Fader
      label={label}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      defaultValue={defaultValue}
      formatValue={format ?? ((v) => `${v}${unit ?? ""}`)}
    />
  )
}
