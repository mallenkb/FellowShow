import { invoke } from "@/lib/ipc"
import { Fragment, useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { RadioGroup } from "@/components/ui/radio-group"
import { switchScriptureTranslation } from "@/lib/switch-scripture-translation"
import { bibleActions } from "@/hooks/use-bible"
import { useBibleStore } from "@/stores/bible-store"
import { useSettingsStore } from "@/stores/settings-store"
import {
  translationDownloadActions,
  useTranslationDownloadStore,
} from "@/stores/translation-download-store"
import { TranslationGroup, type TranslationInfo } from "./translation-group"

export function BibleSection() {
  const translations = useBibleStore((state) => state.translations)
  const [activeId, setActiveId] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const downloadingTranslation = useTranslationDownloadStore(
    (state) => state.abbreviation
  )
  const downloadError = useTranslationDownloadStore((state) => state.error)
  const downloadProgress = useTranslationDownloadStore(
    (state) => state.progress
  )
  const downloadCancelling = useTranslationDownloadStore(
    (state) => state.cancelling
  )
  const suppressSelection = useRef(false)
  const selectionCooldown = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translationOrderIds = useSettingsStore((s) => s.translationOrderIds)
  const [pinnedDropIndex, setPinnedDropIndex] = useState<number | null>(null)
  const [draggedPinnedTranslationId, setDraggedPinnedTranslationId] = useState<
    number | null
  >(null)
  const [translationDropTarget, setTranslationDropTarget] = useState<{
    id: number
    edge: "before" | "after"
  } | null>(null)
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
        useBibleStore.getState().setTranslations(trans)
        setActiveId(active)
      } catch (e) {
        console.error("Failed to load translations:", e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const handleChange = async (value: string) => {
    if (suppressSelection.current) return
    const id = parseInt(value)
    try {
      await switchScriptureTranslation(id)
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

  const preferredEnglishOrder = ["NKJV", "NIV", "KJV", "AMP", "NLT"]
  const englishTranslations = translations
    .filter((t) => t.language === "en")
    .sort((a, b) => {
      const savedA = translationOrderIds.indexOf(a.id)
      const savedB = translationOrderIds.indexOf(b.id)
      if (savedA !== -1 || savedB !== -1)
        return (
          (savedA === -1 ? Infinity : savedA) -
          (savedB === -1 ? Infinity : savedB)
        )
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
      const savedA = translationOrderIds.indexOf(a.id)
      const savedB = translationOrderIds.indexOf(b.id)
      if (savedA !== -1 || savedB !== -1)
        return (
          (savedA === -1 ? Infinity : savedA) -
          (savedB === -1 ? Infinity : savedB)
        )
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
  const orderedPinnedTranslations = pinnedTranslationIds
    .map((id) => translations.find((translation) => translation.id === id))
    .filter(
      (translation): translation is TranslationInfo =>
        translation !== undefined && translation.is_downloaded
    )
  const pinnedTranslations = orderedPinnedTranslations
  // Keep hit targets stationary while dragging. Mark the insertion edge instead.
  const previewPinnedTranslations = pinnedTranslations
  const previewEnglishTranslations = englishTranslations
  const previewOtherTranslations = otherTranslations

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

  const moveTranslationToPosition = (
    fromId: number,
    targetId: number,
    edge: "before" | "after"
  ) => {
    const source = translations.find((t) => t.id === fromId)
    const target = translations.find((t) => t.id === targetId)
    if (
      !source?.is_downloaded ||
      !target ||
      fromId === targetId ||
      source.language !== target.language
    )
      return
    const ids = [...englishTranslations, ...otherTranslations]
      .map((t) => t.id)
      .filter((id) => id !== fromId)
    const targetIndex = ids.indexOf(targetId)
    if (targetIndex < 0) return
    ids.splice(targetIndex + (edge === "after" ? 1 : 0), 0, fromId)
    useSettingsStore.getState().setTranslationOrderIds(ids)
    // Reordering does not pin, unhide, or select a translation.
    if (pinnedTranslationIds.includes(fromId)) {
      setPinnedTranslationIds(
        ids.filter((id) => pinnedTranslationIds.includes(id))
      )
    }
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
    fallbackIndex?: number
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const dropIndex =
      pinnedDropIndex ?? fallbackIndex ?? pinnedTranslations.length

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
    event.stopPropagation()
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
    suppressSelection.current = true
    if (selectionCooldown.current) clearTimeout(selectionCooldown.current)
    setDraggedPinnedTranslationId(id)
    event.dataTransfer.setData("application/x-cop-translation-id", String(id))
    event.dataTransfer.effectAllowed = "copyMove"
  }

  const handleTranslationDragOver = (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    const edge = event.clientY > rect.top + rect.height / 2 ? "after" : "before"
    event.dataTransfer.dropEffect = "move"
    setTranslationDropTarget({ id: targetId, edge })
  }

  const handleTranslationDrop = (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => {
    event.preventDefault()
    event.stopPropagation()
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
      moveTranslationToPosition(Number(translationId), targetId, edge)
    }
    setTranslationDropTarget(null)
    setPinnedDropIndex(null)
    setDraggedPinnedTranslationId(null)
  }

  const clearTranslationDragState = () => {
    if (selectionCooldown.current) clearTimeout(selectionCooldown.current)
    selectionCooldown.current = setTimeout(() => {
      suppressSelection.current = false
    }, 300)
    setTranslationDropTarget(null)
    setPinnedDropIndex(null)
    setDraggedPinnedTranslationId(null)
  }

  const renderTranslationDropMarker = (id: number, edge: "before" | "after") =>
    translationDropTarget?.id === id && translationDropTarget.edge === edge ? (
      <div className="relative h-0 px-3" aria-hidden="true">
        <div className="pointer-events-none absolute inset-x-3 -top-px z-10 h-0.5 rounded-full bg-primary-emphasis" />
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
              onDrop={(event) => handlePinnedDrop(event)}
              className="flex min-h-16 items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 p-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Pinned Translations
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {pinnedTranslations.length > 0 ? (
                    <>
                      {renderPinnedDropMarker(0)}
                      {previewPinnedTranslations.map((translation, index) => (
                        <Fragment key={translation.id}>
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              suppressSelection.current = true
                              if (selectionCooldown.current)
                                clearTimeout(selectionCooldown.current)
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
                            onDragEnd={clearTranslationDragState}
                            onClick={() => {
                              if (!suppressSelection.current)
                                togglePinnedTranslation(translation.id)
                            }}
                            className={`cursor-grab rounded-md border border-primary-emphasis/35 bg-primary/10 px-2 py-1 text-xs font-medium text-primary-emphasis transition hover:bg-primary/15 active:cursor-grabbing ${
                              draggedPinnedTranslationId === translation.id
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            {translation.abbreviation}
                          </button>
                          {renderPinnedDropMarker(index + 1)}
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
              onDownloadTranslation={(translation) =>
                void translationDownloadActions
                  .start(translation)
                  .catch(console.error)
              }
              onCancelDownload={() =>
                void translationDownloadActions.cancel().catch(console.error)
              }
              onMoveTranslation={moveTranslationToPosition}
              onTranslationDragStart={handleTranslationDragStart}
              onTranslationDragOver={handleTranslationDragOver}
              onTranslationDrop={handleTranslationDrop}
              onTranslationDragEnd={clearTranslationDragState}
              renderTranslationDropMarker={renderTranslationDropMarker}
              downloadingTranslation={downloadingTranslation}
              downloadProgress={downloadProgress}
              downloadCancelling={downloadCancelling}
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
              onDownloadTranslation={(translation) =>
                void translationDownloadActions
                  .start(translation)
                  .catch(console.error)
              }
              onCancelDownload={() =>
                void translationDownloadActions.cancel().catch(console.error)
              }
              onMoveTranslation={moveTranslationToPosition}
              onTranslationDragStart={handleTranslationDragStart}
              onTranslationDragOver={handleTranslationDragOver}
              onTranslationDrop={handleTranslationDrop}
              onTranslationDragEnd={clearTranslationDragState}
              renderTranslationDropMarker={renderTranslationDropMarker}
              downloadingTranslation={downloadingTranslation}
              downloadProgress={downloadProgress}
              downloadCancelling={downloadCancelling}
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
