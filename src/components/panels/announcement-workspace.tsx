import { lazy, Suspense, useMemo, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilePlus2Icon,
  TextIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  announcementPageIndexForItem,
  announcementPageToVerse,
  announcementPlainText,
  paginateAnnouncementSet,
} from "@/lib/announcements"
import {
  useAnnouncementStore,
  useBroadcastStore,
  useTickerComposerStore,
} from "@/stores"

const AnnouncementEditor = lazy(
  () => import("@/components/announcements/announcement-editor")
)

export function AnnouncementWorkspace() {
  const sets = useAnnouncementStore((state) => state.sets)
  const selectedSetId = useAnnouncementStore((state) => state.selectedSetId)
  const selectedItemId = useAnnouncementStore((state) => state.selectedItemId)
  const [pageSelection, setPageSelection] = useState<{
    setId: string | null
    index: number
  }>({ setId: null, index: 0 })
  const selectedSet = sets.find((set) => set.id === selectedSetId) ?? null
  const selectedItem =
    selectedSet?.items.find((item) => item.id === selectedItemId) ?? null
  const pages = useMemo(
    () => (selectedSet ? paginateAnnouncementSet(selectedSet) : []),
    [selectedSet]
  )
  const requestedPageIndex =
    pageSelection.setId === selectedSetId ? pageSelection.index : 0
  const safePageIndex = Math.min(
    requestedPageIndex,
    Math.max(0, pages.length - 1)
  )
  const selectedPage = pages[safePageIndex] ?? null

  const stagePage = (index: number) => {
    if (!selectedSet || !pages[index]) return
    setPageSelection({ setId: selectedSet.id, index })
    useBroadcastStore
      .getState()
      .setPreviewOutput(
        announcementPageToVerse(selectedSet, pages[index]),
        null
      )
  }

  // Edits stage the page with the note being edited, so Preview follows the text.
  const stageEditedPage = (setId: string, itemId: string) => {
    const set = useAnnouncementStore
      .getState()
      .sets.find((candidate) => candidate.id === setId)
    if (!set) return
    const nextPages = paginateAnnouncementSet(set)
    const itemPage = announcementPageIndexForItem(set, nextPages, itemId)
    const index =
      itemPage >= 0 ? itemPage : Math.min(safePageIndex, nextPages.length - 1)
    if (index < 0) return
    setPageSelection({ setId, index })
    useBroadcastStore
      .getState()
      .setPreviewOutput(announcementPageToVerse(set, nextPages[index]), null)
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      {!selectedSet || !selectedItem ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div className="max-w-xs">
            <FilePlus2Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Choose a note</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick or add a note in the Notes list on the left.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <Input
            value={selectedSet.heading}
            onChange={(event) => {
              useAnnouncementStore
                .getState()
                .setHeading(selectedSet.id, event.target.value)
              stageEditedPage(selectedSet.id, selectedItem.id)
            }}
            placeholder="Slide heading (leave empty to hide)"
            aria-label="Slide heading"
            className="mb-2 h-10 shrink-0 border-transparent bg-transparent px-2 text-base font-semibold shadow-none hover:border-border focus-visible:border-primary"
          />
          <div className="min-h-0 flex-1">
            <Suspense
              fallback={
                <div className="h-40 animate-pulse rounded-md bg-muted/40" />
              }
            >
              <AnnouncementEditor
                key={selectedItem.id}
                content={selectedItem.content}
                onChange={(content) => {
                  useAnnouncementStore
                    .getState()
                    .updateItem(selectedSet.id, selectedItem.id, content)
                  stageEditedPage(selectedSet.id, selectedItem.id)
                }}
              />
            </Suspense>
          </div>

          <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
            <span className="mr-auto text-xs text-muted-foreground tabular-nums">
              {pages.length > 0
                ? `Page ${safePageIndex + 1} of ${pages.length}`
                : "Add text to create a page"}
            </span>
            {pages.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Previous page"
                  disabled={safePageIndex <= 0}
                  onClick={() => stagePage(safePageIndex - 1)}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Next page"
                  disabled={safePageIndex >= pages.length - 1}
                  onClick={() => stagePage(safePageIndex + 1)}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-1 h-7"
              disabled={!announcementPlainText(selectedItem.content)}
              onClick={() =>
                useTickerComposerStore
                  .getState()
                  .open(announcementPlainText(selectedItem.content))
              }
            >
              <TextIcon className="size-3.5" />
              Send to scroll
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              disabled={!selectedPage}
              onClick={() => stagePage(safePageIndex)}
            >
              Preview
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
