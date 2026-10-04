import { BackgroundFramingFields } from "@/components/broadcast/background-framing-fields"
import { cn } from "@/lib/utils"
import type { SlideBackgroundChoice } from "@/types"

type MediaChoice = Extract<SlideBackgroundChoice, { type: "media" }>

const FIT_OPTIONS = [
  { value: "cover", label: "Fill the screen" },
  { value: "contain", label: "Show the whole picture" },
] as const

/** Fit, opacity, zoom and crop for an uploaded slide background. */
export function MediaBackgroundAdjust({
  value,
  onChange,
}: {
  value: MediaChoice
  onChange: (choice: MediaChoice) => void
}) {
  const fit = value.fit ?? "cover"

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Size and crop</p>
      <div
        role="radiogroup"
        aria-label="How the picture fits"
        className="grid grid-cols-2 gap-1 rounded-md border border-border p-0.5"
      >
        {FIT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={fit === option.value}
            onClick={() => onChange({ ...value, fit: option.value })}
            className={cn(
              "rounded px-2 py-1.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              fit === option.value
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <BackgroundFramingFields
        framing={value}
        onChange={(patch) => onChange({ ...value, ...patch })}
      />
    </div>
  )
}
