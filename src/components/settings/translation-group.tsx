import { Fragment } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { GripVerticalIcon, PinIcon } from "lucide-react"

export interface TranslationInfo {
  id: number
  abbreviation: string
  title: string
  language: string
  is_downloaded: boolean
  is_copyrighted: boolean
}

export function TranslationGroup({
  title,
  translations,
  activeId,
  hiddenTranslationIds,
  pinnedTranslationIds,
  onToggleHidden,
  onTogglePinned,
  onSelectTranslation,
  onDownloadTranslation,
  onCancelDownload,
  onTranslationDragStart,
  onTranslationDragOver,
  onTranslationDrop,
  onTranslationDragEnd,
  onMoveTranslation,
  renderTranslationDropMarker,
  downloadingTranslation,
  downloadProgress,
  downloadCancelling,
}: {
  title: string
  translations: TranslationInfo[]
  activeId: number
  hiddenTranslationIds: number[]
  pinnedTranslationIds: number[]
  onToggleHidden: (id: number) => void
  onTogglePinned: (id: number) => void
  onSelectTranslation: (id: number) => void
  onDownloadTranslation: (translation: TranslationInfo) => void
  onCancelDownload: (abbreviation: string) => void
  onTranslationDragStart: (
    event: React.DragEvent<HTMLElement>,
    id: number
  ) => void
  onTranslationDragOver: (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => void
  onTranslationDrop: (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => void
  onTranslationDragEnd: () => void
  onMoveTranslation: (
    fromId: number,
    targetId: number,
    edge: "before" | "after"
  ) => void
  renderTranslationDropMarker: (
    id: number,
    edge: "before" | "after"
  ) => React.ReactNode
  downloadingTranslation: string | null
  downloadProgress: number | null
  downloadCancelling: boolean
}) {
  if (translations.length === 0) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
      </div>
      <div className="rounded-md border border-border">
        {translations.map((t, index) => {
          const isDownloaded = t.is_downloaded
          const isPinned = isDownloaded && pinnedTranslationIds.includes(t.id)
          const isHidden = hiddenTranslationIds.includes(t.id)
          const isDownloading = downloadingTranslation === t.abbreviation
          const isAnotherDownloadActive =
            downloadingTranslation !== null && !isDownloading

          return (
            <Fragment key={t.id}>
              {renderTranslationDropMarker(t.id, "before")}
              <div
                onDragOver={(event) => {
                  if (!isDownloaded) return
                  onTranslationDragOver(event, t.id)
                }}
                onDrop={(event) => {
                  if (!isDownloaded) return
                  onTranslationDrop(event, t.id)
                }}
                onDragEnd={onTranslationDragEnd}
                onClick={() => {
                  if (isDownloaded) onSelectTranslation(t.id)
                }}
                className={`flex min-h-10 items-center gap-3 px-3 py-2 transition hover:bg-muted/35 ${
                  isDownloaded ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <button
                  type="button"
                  draggable={isDownloaded}
                  disabled={!isDownloaded}
                  aria-label={`Reorder ${t.abbreviation}`}
                  title="Drag to reorder, or use Alt + Up or Down"
                  onKeyDown={(event) => {
                    if (
                      !event.altKey ||
                      !["ArrowUp", "ArrowDown"].includes(event.key)
                    )
                      return
                    event.preventDefault()
                    event.stopPropagation()
                    const direction = event.key === "ArrowUp" ? -1 : 1
                    const target = translations[index + direction]
                    if (target)
                      onMoveTranslation(
                        t.id,
                        target.id,
                        direction < 0 ? "before" : "after"
                      )
                  }}
                  className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    event.stopPropagation()
                    onTranslationDragStart(event, t.id)
                  }}
                  onDragEnd={onTranslationDragEnd}
                >
                  <GripVerticalIcon className="size-3.5" />
                </button>
                <RadioGroupItem
                  value={String(t.id)}
                  id={`translation-${t.id}`}
                  disabled={!isDownloaded}
                />
                <span className="w-14 shrink-0 text-xs font-medium text-foreground">
                  {t.abbreviation}
                </span>
                <span className="min-w-0 text-xs text-muted-foreground">
                  {t.title}
                </span>
                <span
                  className="ml-auto flex shrink-0 items-center gap-2 text-[0.625rem] text-muted-foreground"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={
                      isPinned
                        ? "text-primary-emphasis"
                        : "text-muted-foreground"
                    }
                    onClick={() => onTogglePinned(t.id)}
                    disabled={!isDownloaded}
                    aria-label={`${isPinned ? "Unpin" : "Pin"} ${t.abbreviation}`}
                  >
                    <PinIcon
                      className={
                        isPinned ? "size-3.5 fill-current" : "size-3.5"
                      }
                    />
                  </Button>
                  {t.id === activeId && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[0.625rem]"
                    >
                      Default
                    </Badge>
                  )}
                  {isDownloaded ? (
                    <>
                      <span>{isHidden ? "Hidden" : "Shown"}</span>
                      <Switch
                        checked={!isHidden}
                        onCheckedChange={() => onToggleHidden(t.id)}
                        disabled={t.id === activeId}
                        aria-label={`${isHidden ? "Show" : "Hide"} ${t.abbreviation}`}
                      />
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`group relative min-w-28 overflow-hidden px-3 text-primary-emphasis disabled:border-border disabled:bg-muted/40 disabled:text-muted-foreground dark:text-white ${
                        isDownloading
                          ? "hover:text-destructive-foreground border-destructive/50 bg-primary/10 hover:border-destructive hover:bg-destructive"
                          : "border-primary-emphasis/45 bg-primary/10 hover:bg-primary/15 hover:text-primary-emphasis dark:hover:text-white"
                      }`}
                      disabled={
                        isAnotherDownloadActive ||
                        (isDownloading && downloadCancelling)
                      }
                      aria-label={
                        isDownloading
                          ? `Cancel ${t.abbreviation} download`
                          : `Download ${t.abbreviation}`
                      }
                      onClick={() =>
                        isDownloading
                          ? onCancelDownload(t.abbreviation)
                          : onDownloadTranslation(t)
                      }
                    >
                      {isDownloading && downloadCancelling ? (
                        "Cancelling..."
                      ) : isDownloading ? (
                        <>
                          <span
                            className="absolute inset-y-0 left-0 bg-primary/40 transition-[width] duration-150 ease-out"
                            style={{ width: `${downloadProgress ?? 5}%` }}
                            aria-hidden
                          />
                          <span className="relative tabular-nums">
                            {downloadProgress != null
                              ? `${downloadProgress}%`
                              : "Downloading"}
                          </span>
                          <span className="relative ml-2 underline">
                            Cancel
                          </span>
                        </>
                      ) : (
                        "Download"
                      )}
                    </Button>
                  )}
                </span>
              </div>
              {renderTranslationDropMarker(t.id, "after")}
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
