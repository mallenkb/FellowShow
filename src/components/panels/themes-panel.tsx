import { useRef, useState } from "react"
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  ImagePlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DEFAULT_ANNOUNCEMENT_THEME_ID,
  DEFAULT_SONG_THEME_ID,
} from "@/lib/builtin-themes"
import { cachePresentationMediaAsset } from "@/lib/presentation-media"
import { sortThemesForSection } from "@/lib/theme-order"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import type { BroadcastTheme } from "@/types"
import {
  sectionFromMode,
  THEME_SECTION_LABELS,
  THEME_THUMBNAIL_BY_SECTION,
  type ThemeAwareMode,
} from "./preview-panel-shared"

export function ThemesPanel({ mode }: { mode: ThemeAwareMode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [isUploadingTheme, setIsUploadingTheme] = useState(false)
  const [draggedThemeId, setDraggedThemeId] = useState<string | null>(null)
  const [themePendingRemoval, setThemePendingRemoval] =
    useState<BroadcastTheme | null>(null)
  const themeImageInputRef = useRef<HTMLInputElement>(null)
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)

  const selectedSection = sectionFromMode(mode)
  const activeThemeId = sectionThemeIds[selectedSection]
  const themesForSection =
    selectedSection === "songs"
      ? themes.filter(
          (theme) =>
            theme.id === DEFAULT_SONG_THEME_ID || theme.section === "songs"
        )
      : selectedSection === "announcements"
        ? themes.filter((theme) => theme.id === DEFAULT_ANNOUNCEMENT_THEME_ID)
        : themes
  const visibleThemes = sortThemesForSection(themesForSection, selectedSection)
  const thumbnailVerse = THEME_THUMBNAIL_BY_SECTION[selectedSection]

  const uploadThemeMedia = (file: File | undefined) => {
    if (!file || isUploadingTheme) return
    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name)
    if (!isImage && !isVideo) {
      toast.error("Choose an image or video file")
      return
    }

    const mediaType = isVideo ? "video" : "image"
    setIsUploadingTheme(true)
    void (async () => {
      try {
        const cachedMedia = await cachePresentationMediaAsset(file, file.name)
        const currentTheme =
          useBroadcastStore
            .getState()
            .themes.find((theme) => theme.id === activeThemeId) ?? themes[0]
        if (!currentTheme) {
          toast.error("No theme is available to customize")
          return
        }

        const now = Date.now()
        const theme: BroadcastTheme = {
          ...currentTheme,
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, "") || "Uploaded Theme",
          builtin: false,
          pinned: true,
          section: selectedSection,
          createdAt: now,
          updatedAt: now,
          background: {
            type: "image",
            color: currentTheme.background.color,
            gradient: null,
            image: {
              url: cachedMedia.url,
              mediaType,
              playbackStartedAt: mediaType === "video" ? now : undefined,
              fit: "cover",
              blur: 0,
              brightness: 100,
              tint: null,
            },
          },
        }
        const store = useBroadcastStore.getState()
        store.saveTheme(theme)
        store.setActiveTheme(theme.id, selectedSection)
        toast.success(
          mediaType === "video"
            ? "Video theme uploaded"
            : "Image theme uploaded"
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not upload theme"
        )
      } finally {
        setIsUploadingTheme(false)
      }
    })()
  }

  const reorderTheme = (targetThemeId: string) => {
    if (!draggedThemeId || draggedThemeId === targetThemeId) return

    const orderedIds = visibleThemes.map((theme) => theme.id)
    const fromIndex = orderedIds.indexOf(draggedThemeId)
    const toIndex = orderedIds.indexOf(targetThemeId)
    if (fromIndex === -1 || toIndex === -1) return

    const nextIds = [...orderedIds]
    const [movedId] = nextIds.splice(fromIndex, 1)
    nextIds.splice(toIndex, 0, movedId)
    useBroadcastStore.getState().reorderThemes(nextIds)
    setDraggedThemeId(null)
  }

  return (
    <div
      data-slot="themes-panel"
      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-muted/35"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 text-xs font-medium tracking-wider break-words text-muted-foreground uppercase">
          Themes
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      {isOpen && (
        <div className="px-3 pt-1 pb-4">
          <input
            ref={themeImageInputRef}
            type="file"
            accept="image/*,video/*,.m4v"
            className="hidden"
            onChange={(event) => {
              uploadThemeMedia(event.target.files?.[0])
              event.target.value = ""
            }}
          />
          {selectedSection !== "announcements" && (
            <div className="mb-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-0 flex-1 justify-center"
                onClick={() => themeImageInputRef.current?.click()}
                title="Upload an image or looping video background"
                disabled={isUploadingTheme}
              >
                <ImagePlusIcon className="size-3.5" />
                {isUploadingTheme ? "Uploading…" : "Upload theme"}
              </Button>
              <Button
                type="button"
                variant={isReordering ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setIsReordering((reordering) => !reordering)
                  setDraggedThemeId(null)
                }}
              >
                <ArrowUpDownIcon className="size-3.5" />
                {isReordering ? "Done" : "Reorder"}
              </Button>
            </div>
          )}
          {visibleThemes.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 px-1 pt-1 pb-2">
              {visibleThemes.map((theme) => {
                const isActive = theme.id === activeThemeId
                return (
                  <div
                    key={theme.id}
                    draggable={isReordering}
                    onDragStart={(event) => {
                      if (!isReordering) return
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData("text/plain", theme.id)
                      setDraggedThemeId(theme.id)
                    }}
                    onDragOver={(event) => {
                      if (!isReordering) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = "move"
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      reorderTheme(theme.id)
                    }}
                    onDragEnd={() => setDraggedThemeId(null)}
                    className={cn(
                      "group relative min-w-0 rounded-lg p-1.5 text-left transition hover:bg-muted/60",
                      isReordering &&
                        "cursor-grab ring-1 ring-border active:cursor-grabbing",
                      draggedThemeId === theme.id && "opacity-50",
                      isActive &&
                        "bg-[#101084]/10 ring-2 ring-[#101084]/40 dark:bg-[#F1E600]/10 dark:ring-[#F1E600]/70"
                    )}
                    title={
                      isReordering
                        ? `Drag to reorder ${theme.name}`
                        : `Use ${theme.name}`
                    }
                  >
                    <button
                      type="button"
                      disabled={isReordering}
                      onClick={() =>
                        useBroadcastStore
                          .getState()
                          .setActiveTheme(theme.id, selectedSection)
                      }
                      className="block w-full text-left disabled:pointer-events-none"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-sm">
                        <CanvasVerse theme={theme} verse={thumbnailVerse} />
                        {isReordering && (
                          <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded bg-background/85 text-foreground shadow-sm">
                            <GripVerticalIcon className="size-4" />
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs leading-tight font-medium text-foreground">
                          {theme.name}
                        </span>
                        {isActive && (
                          <span className="size-2 shrink-0 rounded-full bg-[#101084] dark:bg-[#F1E600]" />
                        )}
                      </div>
                    </button>
                    {!isReordering &&
                      theme.id !== DEFAULT_ANNOUNCEMENT_THEME_ID && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-xs"
                          className="absolute top-2.5 right-2.5 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-destructive"
                          aria-label={`Remove ${theme.name}`}
                          title={`Remove ${theme.name}`}
                          onClick={() => setThemePendingRemoval(theme)}
                        >
                          <Trash2Icon />
                        </Button>
                      )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No themes available for{" "}
              {THEME_SECTION_LABELS[selectedSection].toLowerCase()}.
            </p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={themePendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setThemePendingRemoval(null)
        }}
        title={
          themePendingRemoval?.builtin
            ? "Hide built-in theme?"
            : "Delete theme?"
        }
        description={
          themePendingRemoval
            ? themePendingRemoval.builtin
              ? `“${themePendingRemoval.name}” will be hidden from every tab where it appears.`
              : `“${themePendingRemoval.name}” will be permanently deleted from every tab. This can’t be undone.`
            : undefined
        }
        confirmLabel={themePendingRemoval?.builtin ? "Hide" : "Delete"}
        destructive
        onConfirm={() => {
          if (!themePendingRemoval) return
          useBroadcastStore.getState().deleteTheme(themePendingRemoval.id)
          toast.success(`${themePendingRemoval.name} removed`)
          setThemePendingRemoval(null)
        }}
      />
    </div>
  )
}
