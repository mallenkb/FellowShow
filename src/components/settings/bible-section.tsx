import { invoke } from "@/lib/ipc"
import { Fragment, useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { bibleActions } from "@/hooks/use-bible"
import { useBibleStore } from "@/stores/bible-store"
import { useSettingsStore } from "@/stores/settings-store"
import { PinIcon } from "lucide-react"

interface TranslationInfo {
  id: number
  abbreviation: string
  title: string
  language: string
  is_downloaded: boolean
  is_copyrighted: boolean
}

function TranslationGroup({
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
  renderTranslationDropMarker,
  downloadingTranslation,
  downloadProgress,
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
  renderTranslationDropMarker: (
    id: number,
    edge: "before" | "after"
  ) => React.ReactNode
  downloadingTranslation: string | null
  downloadProgress: number | null
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
        {translations.map((t) => {
          const isRequiredPinned = t.abbreviation === "NKJV"
          const isDownloaded = t.is_downloaded
          const isPinned =
            isRequiredPinned ||
            (isDownloaded && pinnedTranslationIds.includes(t.id))
          const isHidden =
            !isRequiredPinned && hiddenTranslationIds.includes(t.id)
          const isDownloading = downloadingTranslation === t.abbreviation
          const isAnotherDownloadActive =
            downloadingTranslation !== null && !isDownloading

          return (
            <Fragment key={t.id}>
              {renderTranslationDropMarker(t.id, "before")}
              <div
                draggable={isDownloaded}
                onDragStart={(event) => {
                  if (!isDownloaded) return
                  onTranslationDragStart(event, t.id)
                }}
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
                      isPinned || isRequiredPinned
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                    onClick={() => onTogglePinned(t.id)}
                    disabled={isRequiredPinned || !isDownloaded}
                    aria-label={`${isPinned ? "Unpin" : "Pin"} ${t.abbreviation}`}
                  >
                    <PinIcon
                      className={
                        isPinned || isRequiredPinned
                          ? "size-3.5 fill-current"
                          : "size-3.5"
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
                        disabled={t.id === activeId || isRequiredPinned}
                        aria-label={`${isHidden ? "Show" : "Hide"} ${t.abbreviation}`}
                      />
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`group relative h-7 min-w-28 overflow-hidden px-3 text-[0.625rem] font-semibold text-primary disabled:border-border disabled:bg-muted/40 disabled:text-muted-foreground dark:text-white ${
                        isDownloading
                          ? "hover:text-destructive-foreground border-destructive/50 bg-primary/10 hover:border-destructive hover:bg-destructive"
                          : "border-primary/45 bg-primary/10 hover:bg-primary/15 hover:text-primary dark:hover:text-white"
                      }`}
                      disabled={isAnotherDownloadActive}
                      onClick={() =>
                        isDownloading
                          ? onCancelDownload(t.abbreviation)
                          : onDownloadTranslation(t)
                      }
                    >
                      {isDownloading ? (
                        <>
                          <span
                            className="absolute inset-y-0 left-0 bg-primary/40 transition-[width] duration-150 ease-out group-hover:hidden"
                            style={{ width: `${downloadProgress ?? 5}%` }}
                            aria-hidden
                          />
                          <span className="relative tabular-nums group-hover:hidden">
                            {downloadProgress != null
                              ? `${t.abbreviation} ${downloadProgress}%`
                              : `Downloading ${t.abbreviation}`}
                          </span>
                          <span className="relative hidden group-hover:inline">
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

export function BibleSection() {
  const [translations, setTranslations] = useState<TranslationInfo[]>([])
  const [activeId, setActiveId] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [downloadingTranslation, setDownloadingTranslation] = useState<
    string | null
  >(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [pinnedDropIndex, setPinnedDropIndex] = useState<number | null>(null)
  const [draggedPinnedTranslationId, setDraggedPinnedTranslationId] = useState<
    number | null
  >(null)
  const [translationDropTarget, setTranslationDropTarget] = useState<{
    id: number
    edge: "before" | "after"
  } | null>(null)
  const cancelledDownloadsRef = useRef(new Set<string>())
  const hiddenTranslationIds = useSettingsStore((s) => s.hiddenTranslationIds)
  const pinnedTranslationIds = useSettingsStore((s) => s.pinnedTranslationIds)
  const toggleHiddenTranslation = useSettingsStore(
    (s) => s.toggleHiddenTranslation
  )
  const togglePinnedTranslation = useSettingsStore(
    (s) => s.togglePinnedTranslation
  )
  const setPinnedTranslationIds = useSettingsStore(
    (s) => s.setPinnedTranslationIds
  )

  useEffect(() => {
    async function load() {
      try {
        const [trans, active] = await Promise.all([
          invoke("list_translations"),
          invoke("get_active_translation"),
        ])
        setTranslations(trans)
        setActiveId(active)
      } catch (e) {
        console.error("Failed to load translations:", e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const reloadTranslations = async () => {
    const trans = await invoke("list_translations")
    setTranslations(trans)
    useBibleStore.getState().setTranslations(trans)
    return trans
  }

  const handleChange = async (value: string) => {
    const id = parseInt(value)
    try {
      await invoke("set_active_translation", { translationId: id })
      setActiveId(id)
      // Update frontend stores so all panels use the new translation
      useBibleStore.getState().setActiveTranslation(id)
      // Refresh the book list for the newly active translation so the main
      // scripture view loads it immediately (the chapter reload is reactive).
      await bibleActions.loadBooks(id)
      if (hiddenTranslationIds.includes(id)) {
        useSettingsStore.getState().toggleHiddenTranslation(id)
      }
    } catch (e) {
      console.error("Failed to set translation:", e)
    }
  }

  const handleDownloadTranslation = async (translation: TranslationInfo) => {
    const { abbreviation } = translation
    cancelledDownloadsRef.current.delete(abbreviation)
    setDownloadingTranslation(abbreviation)
    setDownloadProgress(null)
    setDownloadError(null)
    const { listen } = await import("@tauri-apps/api/event")
    const unlisten = await listen<{
      abbreviation: string
      downloaded: number
      total: number | null
    }>("translation:download-progress", (event) => {
      if (event.payload.abbreviation !== abbreviation) return
      const { downloaded, total } = event.payload
      setDownloadProgress(
        total ? Math.min(100, Math.round((downloaded / total) * 100)) : null
      )
    })
    try {
      const downloaded = await invoke("download_translation", {
        abbreviation,
      })
      if (cancelledDownloadsRef.current.has(abbreviation)) {
        cancelledDownloadsRef.current.delete(abbreviation)
        return
      }
      setTranslations((current) =>
        current.map((translation) =>
          translation.id === downloaded.id ? downloaded : translation
        )
      )
      useBibleStore
        .getState()
        .setTranslations(
          translations.map((translation) =>
            translation.id === downloaded.id ? downloaded : translation
          )
        )
      await reloadTranslations()
      // Just install it: don't make it the active/default translation, and keep
      // it hidden until the user turns on "Shown" themselves.
      const hiddenIds = useSettingsStore.getState().hiddenTranslationIds
      if (!hiddenIds.includes(downloaded.id)) {
        useSettingsStore
          .getState()
          .setHiddenTranslationIds([...hiddenIds, downloaded.id])
      }
    } catch (e) {
      if (cancelledDownloadsRef.current.has(abbreviation)) {
        cancelledDownloadsRef.current.delete(abbreviation)
        return
      }
      console.error(`Failed to download ${abbreviation}:`, e)
      setDownloadError(e instanceof Error ? e.message : String(e))
    } finally {
      unlisten()
      setDownloadProgress(null)
      setDownloadingTranslation((current) =>
        current === abbreviation ? null : current
      )
    }
  }

  const handleCancelDownload = (abbreviation: string) => {
    cancelledDownloadsRef.current.add(abbreviation)
    setDownloadError(null)
    setDownloadProgress(null)
    setDownloadingTranslation((current) =>
      current === abbreviation ? null : current
    )
  }

  const preferredEnglishOrder = ["NKJV", "NIV", "KJV", "AMP", "NLT"]
  const englishTranslations = translations
    .filter((t) => t.language === "en")
    .sort((a, b) => {
      const aIndex = preferredEnglishOrder.indexOf(a.abbreviation)
      const bIndex = preferredEnglishOrder.indexOf(b.abbreviation)
      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? preferredEnglishOrder.length : aIndex) -
          (bIndex === -1 ? preferredEnglishOrder.length : bIndex)
        )
      }
      return a.abbreviation.localeCompare(b.abbreviation)
    })
  const preferredOtherOrder = ["ATWI", "WASNA"]
  const otherTranslations = translations
    .filter((t) => t.language !== "en")
    .sort((a, b) => {
      const aIndex = preferredOtherOrder.indexOf(a.abbreviation)
      const bIndex = preferredOtherOrder.indexOf(b.abbreviation)
      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? preferredOtherOrder.length : aIndex) -
          (bIndex === -1 ? preferredOtherOrder.length : bIndex)
        )
      }
      return 0
    })
  const activeTranslation = translations.find((t) => t.id === activeId)
  const installedTranslations = translations.filter(
    (translation) => translation.is_downloaded
  )
  const hiddenInstalledCount = hiddenTranslationIds.filter((id) =>
    installedTranslations.some((translation) => translation.id === id)
  ).length
  const nkjvTranslation = translations.find(
    (translation) =>
      translation.abbreviation === "NKJV" && translation.is_downloaded
  )
  const orderedPinnedTranslations = pinnedTranslationIds
    .map((id) => translations.find((translation) => translation.id === id))
    .filter(
      (translation): translation is TranslationInfo =>
        translation !== undefined && translation.is_downloaded
    )
  const pinnedTranslations =
    nkjvTranslation && !pinnedTranslationIds.includes(nkjvTranslation.id)
      ? [nkjvTranslation, ...orderedPinnedTranslations]
      : orderedPinnedTranslations
  const previewPinnedTranslations =
    draggedPinnedTranslationId !== null && pinnedDropIndex !== null
      ? (() => {
          const fromIndex = pinnedTranslations.findIndex(
            (translation) => translation.id === draggedPinnedTranslationId
          )
          if (fromIndex === -1) return pinnedTranslations

          const nextTranslations = [...pinnedTranslations]
          const [movedTranslation] = nextTranslations.splice(fromIndex, 1)
          const adjustedIndex =
            fromIndex < pinnedDropIndex ? pinnedDropIndex - 1 : pinnedDropIndex
          nextTranslations.splice(
            Math.min(adjustedIndex, nextTranslations.length),
            0,
            movedTranslation
          )
          return nextTranslations
        })()
      : pinnedTranslations

  const previewTranslationGroup = (groupTranslations: TranslationInfo[]) => {
    if (!translationDropTarget || draggedPinnedTranslationId === null) {
      return groupTranslations
    }

    const fromIndex = groupTranslations.findIndex(
      (translation) => translation.id === draggedPinnedTranslationId
    )
    const targetIndex = groupTranslations.findIndex(
      (translation) => translation.id === translationDropTarget.id
    )
    if (fromIndex === -1 || targetIndex === -1) return groupTranslations

    const nextTranslations = [...groupTranslations]
    const [movedTranslation] = nextTranslations.splice(fromIndex, 1)
    const targetIndexAfterRemoval = nextTranslations.findIndex(
      (translation) => translation.id === translationDropTarget.id
    )
    const insertIndex =
      targetIndexAfterRemoval === -1
        ? targetIndex
        : targetIndexAfterRemoval +
          (translationDropTarget.edge === "after" ? 1 : 0)
    nextTranslations.splice(
      Math.min(insertIndex, nextTranslations.length),
      0,
      movedTranslation
    )
    return nextTranslations
  }

  const previewEnglishTranslations =
    previewTranslationGroup(englishTranslations)
  const previewOtherTranslations = previewTranslationGroup(otherTranslations)

  const pinTranslation = (id: number, index = pinnedTranslations.length) => {
    if (hiddenTranslationIds.includes(id)) {
      toggleHiddenTranslation(id)
    }
    if (!pinnedTranslationIds.includes(id)) {
      const nextIds = pinnedTranslations.map((t) => t.id)
      nextIds.splice(Math.min(index, nextIds.length), 0, id)
      setPinnedTranslationIds(nextIds)
    }
  }

  const moveTranslationToPinnedPosition = (
    fromId: number,
    targetId: number,
    edge: "before" | "after"
  ) => {
    const targetTranslation = translations.find(
      (translation) => translation.id === targetId
    )
    if (!targetTranslation?.is_downloaded || fromId === targetId) return
    if (hiddenTranslationIds.includes(fromId)) {
      toggleHiddenTranslation(fromId)
    }

    const orderedIds = pinnedTranslations
      .map((translation) => translation.id)
      .filter((id) => id !== fromId)
    const targetIndex = orderedIds.indexOf(targetId)
    const insertIndex =
      targetIndex === -1
        ? edge === "before"
          ? 0
          : orderedIds.length
        : targetIndex + (edge === "after" ? 1 : 0)

    orderedIds.splice(Math.min(insertIndex, orderedIds.length), 0, fromId)
    setPinnedTranslationIds(orderedIds)
  }

  const handleTogglePinned = (id: number) => {
    if (pinnedTranslationIds.includes(id)) {
      togglePinnedTranslation(id)
      return
    }

    pinTranslation(id)
  }

  const handlePinnedDrop = (
    event: React.DragEvent<HTMLElement>,
    fallbackIndex = pinnedTranslations.length
  ) => {
    event.preventDefault()
    const dropIndex = pinnedDropIndex ?? fallbackIndex

    const pinnedTranslationId = event.dataTransfer.getData(
      "application/x-cop-pinned-translation-id"
    )
    if (pinnedTranslationId) {
      handlePinnedReorder(Number(pinnedTranslationId), dropIndex)
      setPinnedDropIndex(null)
      setDraggedPinnedTranslationId(null)
      return
    }

    const translationId = event.dataTransfer.getData(
      "application/x-cop-translation-id"
    )
    if (!translationId) {
      setPinnedDropIndex(null)
      return
    }

    pinTranslation(Number(translationId), dropIndex)
    setPinnedDropIndex(null)
  }

  const handlePinnedReorder = (fromId: number, toIndex: number) => {
    const orderedIds = pinnedTranslations.map((translation) => translation.id)
    const fromIndex = orderedIds.indexOf(fromId)
    if (fromIndex === -1) return

    const nextIds = [...orderedIds]
    const [movedId] = nextIds.splice(fromIndex, 1)
    const adjustedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
    nextIds.splice(Math.min(adjustedIndex, nextIds.length), 0, movedId)
    setPinnedTranslationIds(nextIds)
  }

  const updatePinnedDropIndex = (
    event: React.DragEvent<HTMLElement>,
    index: number
  ) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const after = event.clientX > rect.left + rect.width / 2
    event.dataTransfer.dropEffect = Array.from(
      event.dataTransfer.types
    ).includes("application/x-cop-pinned-translation-id")
      ? "move"
      : "copy"
    setPinnedDropIndex(index + (after ? 1 : 0))
  }

  const handleTranslationDragStart = (
    event: React.DragEvent<HTMLElement>,
    id: number
  ) => {
    setDraggedPinnedTranslationId(id)
    event.dataTransfer.setData("application/x-cop-translation-id", String(id))
    event.dataTransfer.effectAllowed = "copyMove"
  }

  const handleTranslationDragOver = (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const edge = event.clientY > rect.top + rect.height / 2 ? "after" : "before"
    event.dataTransfer.dropEffect = Array.from(
      event.dataTransfer.types
    ).includes("application/x-cop-pinned-translation-id")
      ? "move"
      : "copy"
    setTranslationDropTarget({ id: targetId, edge })
  }

  const handleTranslationDrop = (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => {
    event.preventDefault()
    const edge =
      translationDropTarget?.id === targetId
        ? translationDropTarget.edge
        : "after"
    const pinnedTranslationId = event.dataTransfer.getData(
      "application/x-cop-pinned-translation-id"
    )
    const translationId =
      pinnedTranslationId ||
      event.dataTransfer.getData("application/x-cop-translation-id")
    if (translationId) {
      moveTranslationToPinnedPosition(Number(translationId), targetId, edge)
    }
    setTranslationDropTarget(null)
    setPinnedDropIndex(null)
    setDraggedPinnedTranslationId(null)
  }

  const clearTranslationDragState = () => {
    setTranslationDropTarget(null)
    setPinnedDropIndex(null)
    setDraggedPinnedTranslationId(null)
  }

  const renderTranslationDropMarker = (id: number, edge: "before" | "after") =>
    translationDropTarget?.id === id && translationDropTarget.edge === edge ? (
      <div className="px-3" aria-hidden="true">
        <div className="h-0.5 rounded-full bg-primary" />
      </div>
    ) : null

  const renderPinnedDropMarker = (index: number) =>
    pinnedDropIndex === index ? (
      <span aria-hidden="true" className="h-8 w-0.5 rounded-full bg-primary" />
    ) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">
            Loading translations...
          </p>
        ) : (
          <RadioGroup
            value={String(activeId)}
            onValueChange={(value) => void handleChange(value)}
            className="space-y-5"
          >
            <div
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = Array.from(
                  event.dataTransfer.types
                ).includes("application/x-cop-pinned-translation-id")
                  ? "move"
                  : "copy"
                if (pinnedTranslations.length === 0) {
                  setPinnedDropIndex(0)
                }
              }}
              onDragLeave={(event) => {
                const relatedTarget = event.relatedTarget
                if (
                  !(relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(relatedTarget)
                ) {
                  setPinnedDropIndex(null)
                  setTranslationDropTarget(null)
                }
              }}
              onDrop={handlePinnedDrop}
              className="flex min-h-16 items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 p-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Pinned Translations
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {pinnedTranslations.length > 0 ? (
                    <>
                      {draggedPinnedTranslationId === null
                        ? renderPinnedDropMarker(0)
                        : null}
                      {previewPinnedTranslations.map((translation, index) => (
                        <Fragment key={translation.id}>
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              setDraggedPinnedTranslationId(translation.id)
                              event.dataTransfer.setData(
                                "application/x-cop-pinned-translation-id",
                                String(translation.id)
                              )
                              event.dataTransfer.effectAllowed = "move"
                            }}
                            onDragOver={(event) =>
                              updatePinnedDropIndex(event, index)
                            }
                            onDrop={(event) =>
                              handlePinnedDrop(event, index + 1)
                            }
                            onDragEnd={() => {
                              setDraggedPinnedTranslationId(null)
                              setPinnedDropIndex(null)
                              setTranslationDropTarget(null)
                            }}
                            onClick={() => {
                              if (translation.abbreviation !== "NKJV") {
                                togglePinnedTranslation(translation.id)
                              }
                            }}
                            className={`cursor-grab rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/15 active:cursor-grabbing ${
                              draggedPinnedTranslationId === translation.id
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            {translation.abbreviation}
                          </button>
                          {draggedPinnedTranslationId === null
                            ? renderPinnedDropMarker(index + 1)
                            : null}
                        </Fragment>
                      ))}
                    </>
                  ) : activeTranslation ? (
                    <Badge variant="secondary" className="text-[0.625rem]">
                      Default: {activeTranslation.abbreviation}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No pins yet
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                Drop to pin
              </Badge>
            </div>
            <TranslationGroup
              title="English Translations"
              translations={previewEnglishTranslations}
              activeId={activeId}
              hiddenTranslationIds={hiddenTranslationIds}
              pinnedTranslationIds={pinnedTranslationIds}
              onToggleHidden={toggleHiddenTranslation}
              onTogglePinned={handleTogglePinned}
              onSelectTranslation={(id) => void handleChange(String(id))}
              onDownloadTranslation={(abbreviation) =>
                void handleDownloadTranslation(abbreviation)
              }
              onCancelDownload={handleCancelDownload}
              onTranslationDragStart={handleTranslationDragStart}
              onTranslationDragOver={handleTranslationDragOver}
              onTranslationDrop={handleTranslationDrop}
              onTranslationDragEnd={clearTranslationDragState}
              renderTranslationDropMarker={renderTranslationDropMarker}
              downloadingTranslation={downloadingTranslation}
              downloadProgress={downloadProgress}
            />
            <TranslationGroup
              title="Other Languages"
              translations={previewOtherTranslations}
              activeId={activeId}
              hiddenTranslationIds={hiddenTranslationIds}
              pinnedTranslationIds={pinnedTranslationIds}
              onToggleHidden={toggleHiddenTranslation}
              onTogglePinned={handleTogglePinned}
              onSelectTranslation={(id) => void handleChange(String(id))}
              onDownloadTranslation={(abbreviation) =>
                void handleDownloadTranslation(abbreviation)
              }
              onCancelDownload={handleCancelDownload}
              onTranslationDragStart={handleTranslationDragStart}
              onTranslationDragOver={handleTranslationDragOver}
              onTranslationDrop={handleTranslationDrop}
              onTranslationDragEnd={clearTranslationDragState}
              renderTranslationDropMarker={renderTranslationDropMarker}
              downloadingTranslation={downloadingTranslation}
              downloadProgress={downloadProgress}
            />
          </RadioGroup>
        )}
        <p className="text-[0.625rem] text-muted-foreground">
          Detected verses will display in this translation.
          {installedTranslations.length > 0 &&
            ` ${installedTranslations.length - hiddenInstalledCount} shown, ${hiddenInstalledCount} hidden.`}
        </p>
        {downloadError && (
          <p className="text-[0.625rem] text-destructive">{downloadError}</p>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Remote Control                                                   */
/* -------------------------------------------------------------------------- */
