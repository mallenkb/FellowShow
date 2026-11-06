import { CheckIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useQueueStore } from "@/stores"
import type { Verse } from "@/types"

export function VerseQueueAction({
  verse,
  reference,
  confidence,
  isQueued,
  overlay = false,
  isSelected = false,
}: {
  verse: Verse
  reference: string
  confidence: number
  isQueued: boolean
  overlay?: boolean
  isSelected?: boolean
}) {
  if (isQueued) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Show ${reference} in queue`}
              className={cn(
                "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                overlay && "absolute top-1/2 right-2 -translate-y-1/2"
              )}
              onClick={(event) => {
                event.stopPropagation()
                const store = useQueueStore.getState()
                const index = store.findDuplicate(
                  verse.book_number,
                  verse.chapter,
                  verse.verse
                )
                if (index === -1) return
                store.flashItem(store.items[index].id)
                document
                  .querySelector(
                    `[data-slot="queue-panel"] [data-queue-idx="${index}"]`
                  )
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
              }}
            >
              <CheckIcon className="size-4 text-green-700 dark:text-ai-direct" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Already in queue</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Add ${reference} to queue`}
            className={cn(
              "shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
              overlay
                ? "absolute top-1/2 right-2 -translate-y-1/2 !bg-primary text-primary-foreground hover:!bg-primary/80"
                : isSelected
                  ? "text-primary-emphasis hover:bg-primary/20 hover:text-primary-emphasis dark:!bg-primary dark:!text-primary-foreground dark:hover:!bg-primary/80"
                  : "!bg-primary/70 text-primary-foreground hover:!bg-primary dark:!bg-primary dark:hover:!bg-primary/80"
            )}
            onClick={(event) => {
              event.stopPropagation()
              useQueueStore.getState().addItem({
                id: crypto.randomUUID(),
                verse,
                reference,
                confidence,
                source: "manual",
                added_at: Date.now(),
              })
            }}
          >
            <PlusIcon className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className={cn(
            "bg-primary text-primary-foreground [--tooltip-bg:var(--primary)]",
            !overlay && "group-hover:opacity-100"
          )}
        >
          Add to queue
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
