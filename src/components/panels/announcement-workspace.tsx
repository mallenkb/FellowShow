import { lazy, Suspense, useMemo, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilePlus2Icon,
  RadioIcon,
  TextIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PanelHeader } from "@/components/ui/panel-header"
import {
  announcementPageToVerse,
  announcementPlainText,
  paginateAnnouncementSet,
} from "@/lib/announcements"
import type { AnnouncementMark, AnnouncementRenderData } from "@/types"
import {
  useAnnouncementStore,
  useBroadcastStore,
  useTickerComposerStore,
} from "@/stores"

const AnnouncementEditor = lazy(
  () => import("@/components/announcements/announcement-editor")
)

function markClassName(marks: AnnouncementMark[]): string {
  return [
    marks.includes("bold") ? "font-bold" : "",
    marks.includes("italic") ? "italic" : "",
    marks.includes("underline") ? "underline" : "",
  ]
    .filter(Boolean)
    .join(" ")
}

function AnnouncementPagePreview({ page }: { page: AnnouncementRenderData }) {
  return (
    <div className="mt-3 space-y-2 text-sm leading-snug">
      {page.items.map((item) => {
        let number = 0
        return item.blocks.map((block, blockIndex) => {
          const prefix =
            block.kind === "bullet"
              ? "•"
              : block.kind === "number"
                ? `${++number}.`
                : null
          return (
            <div
              key={`${item.number}-${blockIndex}`}
              className="flex min-w-0 items-start gap-2"
            >
              {prefix ? (
                <span className="w-4 shrink-0 text-right font-bold">
                  {prefix}
                </span>
              ) : null}
              <p className="min-w-0 flex-1 wrap-break-word">
                {block.runs.map((run, runIndex) => (
                  <span
                    key={`${item.number}-${blockIndex}-${runIndex}`}
                    className={markClassName(run.marks)}
                  >
                    {run.text}
                  </span>
                ))}
              </p>
            </div>
          )
        })
      })}
    </div>
  )
}

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

  const showPage = (index: number) => {
    if (!selectedSet || !pages[index]) return
    setPageSelection({ setId: selectedSet.id, index })
    useBroadcastStore
      .getState()
      .presentOnLive(announcementPageToVerse(selectedSet, pages[index]), null)
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <PanelHeader title="Announcement editor" />
      {!selectedSet || !selectedItem ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div className="max-w-xs">
            <FilePlus2Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Choose or create a set</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Announcement sets and items are managed in the left panel.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <label className="shrink-0 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Announcement title
            </span>
            <Input
              className="h-9"
              value={selectedItem.title}
              onChange={(event) =>
                useAnnouncementStore
                  .getState()
                  .renameItem(
                    selectedSet.id,
                    selectedItem.id,
                    event.target.value
                  )
              }
              placeholder="Announcement title"
            />
          </label>

          <div className="mt-3">
            <Suspense
              fallback={
                <div className="h-40 animate-pulse rounded-md bg-muted/40" />
              }
            >
              <AnnouncementEditor
                key={selectedItem.id}
                content={selectedItem.content}
                onChange={(content) =>
                  useAnnouncementStore
                    .getState()
                    .updateItem(selectedSet.id, selectedItem.id, content)
                }
              />
            </Suspense>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[0.6875rem] text-muted-foreground">
                {announcementPlainText(selectedItem.content).length} characters
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground hover:text-foreground disabled:opacity-40"
                  disabled={!announcementPlainText(selectedItem.content)}
                  onClick={() =>
                    useTickerComposerStore
                      .getState()
                      .open(announcementPlainText(selectedItem.content))
                  }
                >
                  <TextIcon className="size-3" /> Send to scroll
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  className="text-[0.6875rem] text-muted-foreground hover:text-destructive disabled:opacity-40"
                  disabled={selectedSet.items.length <= 1}
                  onClick={() =>
                    useAnnouncementStore
                      .getState()
                      .deleteItem(selectedSet.id, selectedItem.id)
                  }
                >
                  Remove item
                </button>
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">
                {pages.length > 0
                  ? `Page ${safePageIndex + 1} of ${pages.length}`
                  : "Add text to create a page"}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
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
                  disabled={safePageIndex >= pages.length - 1}
                  onClick={() => stagePage(safePageIndex + 1)}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
            {selectedPage ? (
              <button
                type="button"
                className="mt-2 w-full rounded bg-[#101084] p-4 text-left text-white"
                onClick={() => stagePage(safePageIndex)}
                onDoubleClick={() => showPage(safePageIndex)}
              >
                <span className="block text-center text-xl font-bold text-[#F1E600]">
                  Announcements
                </span>
                <AnnouncementPagePreview page={selectedPage} />
              </button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="mt-2 w-full"
              disabled={!selectedPage}
              onClick={() => showPage(safePageIndex)}
            >
              <RadioIcon className="size-3.5" />
              Show page on Live
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
