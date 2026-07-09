import { cn } from "@/lib/utils"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Inline "scrubber" slider — the whole row is the control, with the label on the
 * left and the value on the right, both reading muted until you hover/focus.
 * Adapted from Fluid Functionalism's SliderComfortable (scrubber variant), built
 * on a native range for keyboard + a11y instead of pulling in framer-motion.
 *
 * `bipolar` fills from the centre outward (for signed axes like position offset).
 */
export function Fader({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  bipolar = false,
  defaultValue,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  formatValue?: (value: number) => string
  bipolar?: boolean
  defaultValue?: number
  disabled?: boolean
  className?: string
  "aria-label"?: string
}) {
  const range = max - min || 1
  const pct = clamp(((value - min) / range) * 100, 0, 100)
  const centerPct = bipolar ? clamp(((0 - min) / range) * 100, 0, 100) : 0
  const fillLeft = Math.min(pct, centerPct)
  const fillWidth = Math.abs(pct - centerPct)
  const display = formatValue ? formatValue(value) : String(value)
  const canReset = defaultValue !== undefined

  return (
    <div
      className={cn(
        "group relative flex h-9 w-full items-center justify-between gap-3 overflow-hidden rounded-full border border-border bg-background/40 px-4 select-none",
        "focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-ring",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onDoubleClick={canReset ? () => onChange(defaultValue) : undefined}
      title={canReset ? "Double-click to reset" : undefined}
    >
      {/* Filled portion — from the centre for bipolar axes, otherwise from the left */}
      <div
        className="pointer-events-none absolute inset-y-0 bg-foreground/10"
        style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
      />
      {/* Centre marker for bipolar axes */}
      {bipolar ? (
        <div
          className="pointer-events-none absolute inset-y-2.5 w-px -translate-x-1/2 bg-border"
          style={{ left: `${centerPct}%` }}
        />
      ) : null}
      {/* Indicator line: foreground/25 → /50 on hover → full on focus/drag */}
      <div
        className="pointer-events-none absolute inset-y-2 z-[1] w-0.5 -translate-x-1/2 rounded-full bg-foreground/25 transition-colors group-focus-within:bg-foreground group-hover:bg-foreground/50 group-active:bg-foreground"
        style={{ left: `${pct}%` }}
      />
      {/* Label */}
      {label ? (
        <span className="z-[2] min-w-0 shrink truncate text-[13px] text-muted-foreground transition-colors group-focus-within:text-foreground group-hover:text-foreground group-active:text-foreground">
          {label}
        </span>
      ) : null}
      {/* Value readout */}
      <span className="z-[2] shrink-0 text-[13px] text-muted-foreground tabular-nums transition-colors group-focus-within:text-foreground group-hover:text-foreground group-active:text-foreground">
        {display}
      </span>
      {/* Interaction + accessibility layer */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
        className="absolute inset-0 z-[3] m-0 h-full w-full cursor-ew-resize opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  )
}
