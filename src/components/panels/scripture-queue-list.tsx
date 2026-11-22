import { useEffect, useRef } from "react"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { useBibleStore, useBroadcastStore, useQueueStore } from "@/stores"
import type { QueueItem } from "@/types"

export function ScriptureQueueList({ items }: { items: QueueItem[] }) {
  const highlighted = useQueueStore((state) => state.highlightedId)
  const selectedRow = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (highlighted) selectedRow.current?.focus({ preventScroll: false })
  }, [highlighted])
  const verses = items.filter((item) => item.verse.book_number > 0)
  if (!verses.length)
    return (
      <p className="p-3 text-xs text-muted-foreground">
        Add a verse from Bible search to prepare it here.
      </p>
    )
  return (
    <ul className="space-y-1 p-2">
      {verses.map(({ id, reference, verse }) => (
        <li
          key={id}
          className="flex items-start gap-1 rounded-md border border-border p-2"
        >
          <button
            type="button"
            ref={highlighted === id ? selectedRow : undefined}
            aria-label={`Preview queued ${reference}`}
            className="min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              const bible = useBibleStore.getState()
              bible.selectVerse(verse)
              const translation =
                bible.translations.find(
                  (item) => item.id === verse.translation_id
                )?.abbreviation ?? "Scripture"
              useBroadcastStore
                .getState()
                .setPreviewOutput(toVerseRenderData(verse, translation))
            }}
          >
            <span className="block text-xs font-semibold text-primary-emphasis">
              {reference}
            </span>
            <span className="line-clamp-3 text-xs">{verse.text}</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${reference} from queue`}
            onClick={() => useQueueStore.getState().removeItem(id)}
          >
            <XIcon />
          </Button>
        </li>
      ))}
    </ul>
  )
}
