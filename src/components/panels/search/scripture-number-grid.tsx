import { cn } from "@/lib/utils"

export function ScriptureNumberGrid({
  numbers,
  currentNumber,
  label,
  onSelect,
}: {
  numbers: number[]
  currentNumber: number | undefined
  label: "Chapter" | "Verse"
  onSelect: (number: number) => void
}) {
  return (
    <div
      aria-label={`${label} numbers`}
      className="grid grid-cols-6 gap-1.5 p-3"
    >
      {numbers.map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`${label} ${number}`}
          aria-pressed={number === currentNumber}
          onClick={() => onSelect(number)}
          className={cn(
            "flex aspect-square items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            number === currentNumber
              ? "border-[#101084]/50 bg-[#101084]/10 text-[#101084] dark:border-[#F1E600]/60 dark:bg-[#F1E600]/5 dark:text-[#F1E600]"
              : "border-border bg-background text-foreground hover:bg-muted/50"
          )}
        >
          {number}
        </button>
      ))}
    </div>
  )
}
