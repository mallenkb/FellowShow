import { Fader } from "@/components/ui/fader"

export function TransformRange({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  displayFactor = 100,
  unit = "%",
  bipolar = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  defaultValue?: number
  displayFactor?: number
  unit?: string
  bipolar?: boolean
  onChange: (value: number) => void
}) {
  const display = `${Math.round(value * displayFactor)}${unit}`
  const hasDefaultValue = defaultValue !== undefined
  const isDefaultValue =
    hasDefaultValue && Math.abs(value - defaultValue) < 0.0001

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {display}
          </span>
          {hasDefaultValue ? (
            <button
              type="button"
              disabled={isDefaultValue}
              onClick={() => onChange(defaultValue)}
              className="rounded px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>
      <Fader
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        bipolar={bipolar}
        onChange={onChange}
        formatValue={(v) => `${Math.round(v * displayFactor)}${unit}`}
      />
    </div>
  )
}

/** Highlights words from the query that appear in the text. */
