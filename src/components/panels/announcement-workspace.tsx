import { lazy, Suspense, useMemo, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilePlus2Icon,
  PanelBottomIcon,
  PencilIcon,
  TextIcon,
} from "lucide-react"
import {
  sendToBar,
  sendToScroll,
  type OverlayContent,
} from "@/components/on-display/overlay-content"
import type { AnnouncementItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NoteShowUntilField } from "@/components/announcements/note-show-until-field"
import { SlideBackgroundPicker } from "@/components/announcements/slide-background-picker"
import {
  announcementPageIndexForItem,
  announcementPageToVerse,
  announcementPlainText,
  paginateAnnouncementSet,
} from "@/lib/announcements"
import { useAnnouncementStore, useBroadcastStore } from "@/stores"

const AnnouncementEditor = lazy(
  () => import("@/components/announcements/announcement-editor")
)

/** A note as bar or scrolling text: its title, then its words. */
function noteContent(item: AnnouncementItem): OverlayContent {
  return {
    heading: item.title || "Notice",
    text: announcementPlainText(item.content),
    source: "text",
  }
}

export function AnnouncementWorkspace({
  isActive = true,
}: {
  isActive?: boolean
}) {
  const sets = useAnnouncementStore((state) => state.sets)
  const selectedSetId = useAnnouncementStore((state) => state.selectedSetId)
  const selectedItemId = useAnnouncementStore((state) => state.selectedItemId)
  const [pageSelection, setPageSelection] = useState<{
    setId: string | null
    itemId: string | null
    index: number
  }>({ setId: null, itemId: null, index: 0 })
  const selectedSet = sets.find((set) => set.id === selectedSetId) ?? null
  const selectedItem =
    selectedSet?.items.find((item) => item.id === selectedItemId) ?? null
  const pages = useMemo(
    () => (selectedSet ? paginateAnnouncementSet(selectedSet) : []),
    [selectedSet]
  )
  const requestedPageIndex =
    pageSelection.setId === selectedSetId &&
    pageSelection.itemId === selectedItemId
      ? pageSelection.index
      : selectedSet && selectedItemId
        ? Math.max(
            0,
            announcementPageIndexForItem(selectedSet, pages, selectedItemId)
          )
        : 0
  const safePageIndex = Math.min(
    requestedPageIndex,
    Math.max(0, pages.length - 1)
  )
  const selectedPage = pages[safePageIndex] ?? null

  const stagePage = (index: number) => {
    if (!selectedSet || !pages[index]) return
    setPageSelection({ setId: selectedSet.id, itemId: selectedItemId, index })
    useBroadcastStore
      .getState()
      .setPreviewOutput(
        announcementPageToVerse(
          selectedSet,
          pages[index],
          useBroadcastStore.getState().themes
        )
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
    setPageSelection({ setId, itemId, index })
    useBroadcastStore
      .getState()
      .setPreviewOutput(
        announcementPageToVerse(
          set,
          nextPages[index],
          useBroadcastStore.getState().themes
        )
      )
  }

  return (
    <section className="@container/announcement flex min-h-0 flex-col overflow-hidden bg-card">
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
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-3 pt-2">
            <div className="relative mb-1">
              <Input
                value={selectedItem.title}
                onChange={(event) => {
                  useAnnouncementStore
                    .getState()
                    .renameItem(
                      selectedSet.id,
                      selectedItem.id,
                      event.target.value
                    )
                  stageEditedPage(selectedSet.id, selectedItem.id)
                }}
                placeholder="Note title"
                aria-label="Note title"
                className="h-9 px-2 pr-8 text-sm font-semibold"
              />
              <PencilIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
            <Suspense
              fallback={
                <div className="min-h-32 flex-1 animate-pulse rounded-md bg-muted/40" />
              }
            >
              <AnnouncementEditor
                key={selectedItem.id}
                content={selectedItem.content}
                isActive={isActive}
                fill
                compactToolbar
                seamless
                placeholder="Write or paste your note here."
                toolbarActions={
                  <>
                    <NoteShowUntilField
                      setId={selectedSet.id}
                      item={selectedItem}
                      onChange={() =>
                        stageEditedPage(selectedSet.id, selectedItem.id)
                      }
                    />
                    <SlideBackgroundPicker
                      value={selectedItem.background}
                      onChange={(background) => {
                        useAnnouncementStore
                          .getState()
                          .setItemBackground(
                            selectedSet.id,
                            selectedItem.id,
                            background
                          )
                        stageEditedPage(selectedSet.id, selectedItem.id)
                      }}
                    />
                  </>
                }
                onChange={(content) => {
                  useAnnouncementStore
                    .getState()
                    .updateItem(selectedSet.id, selectedItem.id, content)
                  stageEditedPage(selectedSet.id, selectedItem.id)
                }}
              />
            </Suspense>
          </div>

          <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-t border-border px-3 py-2">
            <span className="mr-auto min-w-0 truncate text-xs text-muted-foreground tabular-nums">
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
                  className="size-8"
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
                  className="size-8"
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
              className="h-8 px-2"
              aria-label="Send to bar"
              title="Send to bar"
              disabled={!announcementPlainText(selectedItem.content)}
              onClick={() => sendToBar(noteContent(selectedItem))}
            >
              <PanelBottomIcon className="size-3.5" />
              <span className="hidden @[28rem]/announcement:inline">
                Send to bar
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              aria-label="Send to scroll"
              title="Send to scroll"
              disabled={!announcementPlainText(selectedItem.content)}
              onClick={() => sendToScroll(noteContent(selectedItem))}
            >
              <TextIcon className="size-3.5" />
              <span className="hidden @[28rem]/announcement:inline">
                Send to scroll
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
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
