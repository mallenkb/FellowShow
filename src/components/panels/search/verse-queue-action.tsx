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
            <span
              className={cn(
                "flex size-6 shrink-0 cursor-pointer items-center justify-center",
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
              <CheckIcon className="size-4 text-ai-direct" />
            </span>
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
            className={cn(
              "shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
              overlay
                ? "absolute top-1/2 right-2 -translate-y-1/2 !bg-[#101084] text-white hover:!bg-[#101084]/80 dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
                : isSelected
                  ? "text-[#101084] hover:bg-[#101084]/20 hover:text-[#101084] dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
                  : "!bg-[#101084]/40 text-white hover:!bg-[#101084] dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
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
            "bg-[#101084] text-white [--tooltip-bg:#101084] dark:bg-[#F1E600] dark:text-background dark:[--tooltip-bg:#F1E600]",
            !overlay && "group-hover:opacity-100"
          )}
        >
          Add to queue
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
