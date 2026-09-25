import { cn } from "@/lib/utils"

export function ScriptureChapterGrid({
  count,
  currentChapter,
  onSelect,
}: {
  count: number
  currentChapter: number | undefined
  onSelect: (chapter: number) => void
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 p-3">
      {Array.from({ length: count }, (_, index) => index + 1).map((chapter) => (
        <button
          key={chapter}
          type="button"
          onClick={() => onSelect(chapter)}
          className={cn(
            "flex aspect-square items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors",
            chapter === currentChapter
              ? "border-[#101084]/50 bg-[#101084]/10 text-[#101084] dark:border-[#F1E600]/60 dark:bg-[#F1E600]/5 dark:text-[#F1E600]"
              : "border-border bg-background text-foreground hover:bg-muted/50"
          )}
        >
          {chapter}
        </button>
      ))}
    </div>
  )
}
