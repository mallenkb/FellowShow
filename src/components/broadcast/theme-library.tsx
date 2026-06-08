import { useState, useMemo, type DragEvent } from "react"
import { useBroadcastStore } from "@/stores"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  PlusIcon,
  MoreHorizontalIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  CheckCircleIcon,
  PinIcon,
  PinOffIcon,
  EditIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { importTheme, exportTheme } from "@/lib/theme-designer-files"
import { sortThemesForSection } from "@/lib/theme-order"
import type { BroadcastTheme, BroadcastThemeSection, VerseRenderData } from "@/types"

const PRESENTATION_HIDDEN_BUILTIN_THEME_IDS = new Set([
  "builtin-classic-dark",
  "builtin-modern-light",
  "builtin-broadcast-overlay",
])

const sectionLabels: Record<BroadcastThemeSection, string> = {
  bible: "Scriptures",
  songs: "Songs",
  presentation: "Presentation",
}

const THUMBNAIL_VERSE: VerseRenderData = {
  reference: "John 3:16 (KJV)",
  themeSection: "bible",
  segments: [{ text: "Sample Verse" }],
}

const THUMBNAIL_BY_SECTION: Record<BroadcastThemeSection, VerseRenderData> = {
  bible: THUMBNAIL_VERSE,
  songs: {
    reference: "",
    themeSection: "songs",
    referenceMode: "lyric-footer",
    segments: [{ text: "Sample song lyric" }],
  },
  presentation: {
    reference: "Presentation Slide",
    themeSection: "presentation",
    segments: [],
    presentationImage: {
      url: "/broadcast-previews/full-background.jpg",
      name: "Sample presentation",
      fit: "cover",
    },
  },
}

function ThemeCard({
  theme,
  activeSection,
  isActive,
  isEditing,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  theme: BroadcastTheme
  activeSection: BroadcastThemeSection
  isActive: boolean
  isEditing: boolean
  onSelect: () => void
  onDragStart: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  const thumbnailVerse = THUMBNAIL_BY_SECTION[activeSection]
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(theme.name)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const commitRename = () => {
    const next = renameValue.trim()
    if (next) {
      useBroadcastStore.getState().renameTheme(theme.id, next)
    }
    setRenameOpen(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", theme.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "group relative flex w-full flex-col gap-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isEditing && "ring-2 ring-inset ring-primary"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <CanvasVerse theme={theme} verse={thumbnailVerse} className="h-full w-full" fillContainer />

        {/* Active badge */}
        {isActive && (
          <Badge className="absolute top-1.5 left-1.5 bg-emerald-600 text-[0.5rem] text-white hover:bg-emerald-600">
            Active
          </Badge>
        )}

        {/* Pin icon */}
        {theme.pinned && (
          <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-background/80">
            <PinIcon className="size-3 text-primary" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 items-center gap-1.5 px-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {theme.name}
          </p>
        </div>

        {/* Tags */}
        <div className="flex min-w-0 shrink-0 items-center gap-1">
          {theme.builtin && (
            <Badge variant="outline" className="text-[0.5rem]">
              Built-in
            </Badge>
          )}
        </div>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={(e) => e.stopPropagation()}
              aria-label={`More actions for ${theme.name}`}
            >
              <MoreHorizontalIcon className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-50">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                useBroadcastStore.getState().setActiveTheme(theme.id, activeSection)
              }}
            >
              <CheckCircleIcon className="mr-2 size-3.5" />
              Set for {sectionLabels[activeSection]}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                useBroadcastStore.getState().togglePinTheme(theme.id)
              }}
            >
              {theme.pinned ? (
                <><PinOffIcon className="mr-2 size-3.5" />Unpin</>
              ) : (
                <><PinIcon className="mr-2 size-3.5" />Pin</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setRenameValue(theme.name)
                setRenameOpen(true)
              }}
            >
              <EditIcon className="mr-2 size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteOpen(true)
              }}
            >
              <Trash2Icon className="mr-2 size-3.5" />
              {theme.builtin ? "Hide" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename theme</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commitRename()
            }}
          >
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Theme name"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / hide confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={theme.builtin ? "Hide built-in theme?" : "Delete theme?"}
        description={
          theme.builtin
            ? `"${theme.name}" will be hidden from the library.`
            : `"${theme.name}" will be permanently deleted. This can't be undone.`
        }
        confirmLabel={theme.builtin ? "Hide" : "Delete"}
        destructive
        onConfirm={() => useBroadcastStore.getState().deleteTheme(theme.id)}
      />
    </div>
  )
}

export function ThemeLibrary() {
  const themes = useBroadcastStore((s) => s.themes)
  const selectedThemeSection = useBroadcastStore((s) => s.selectedThemeSection)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const activeThemeId = sectionThemeIds[selectedThemeSection]
  const editingThemeId = useBroadcastStore((s) => s.editingThemeId)
  const [search, setSearch] = useState("")
  const [draggedThemeId, setDraggedThemeId] = useState<string | null>(null)
  const filteredThemes = useMemo(() => {
    let result = themes
    if (selectedThemeSection === "presentation") {
      result = result.filter((theme) => !PRESENTATION_HIDDEN_BUILTIN_THEME_IDS.has(theme.id))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(q))
    }
    return sortThemesForSection(result, selectedThemeSection, activeThemeId)
  }, [themes, search, selectedThemeSection, activeThemeId])

  const builtinThemes = filteredThemes.filter((t) => t.builtin)
  const customThemes = filteredThemes.filter((t) => !t.builtin)

  const reorderVisibleThemes = (targetThemeId: string) => {
    if (!draggedThemeId || draggedThemeId === targetThemeId) return

    const orderedIds = filteredThemes.map((theme) => theme.id)
    const fromIndex = orderedIds.indexOf(draggedThemeId)
    const toIndex = orderedIds.indexOf(targetThemeId)
    if (fromIndex === -1 || toIndex === -1) return

    const nextIds = [...orderedIds]
    const [movedId] = nextIds.splice(fromIndex, 1)
    nextIds.splice(toIndex, 0, movedId)
    useBroadcastStore.getState().reorderThemes(nextIds)
    setDraggedThemeId(null)
  }

  const handleNewTheme = () => {
    useBroadcastStore.getState().createNewTheme()
  }

  const handleImportTheme = () => {
    void (async () => {
      try {
        const theme = await importTheme()
        if (theme) {
          useBroadcastStore.getState().saveTheme(theme)
          useBroadcastStore.getState().startEditing(theme.id)
          useBroadcastStore.getState().setActiveTheme(theme.id, selectedThemeSection)
        }
      } catch (err) {
        console.error("[theme-library] import failed:", err)
      }
    })()
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        <span className="text-lg font-semibold text-foreground">Themes</span>
        <Button onClick={handleNewTheme}>
          <PlusIcon className="size-4" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-4">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7"
          />
        </div>
      </div>

      {/* Import / Export */}
      <div className="flex gap-1.5 px-3 pb-3">
        <Button
          variant="outline"
          className="flex-1 border-border bg-transparent"
          onClick={handleImportTheme}
        >
          <UploadIcon className="size-2.5" />
          Import
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-border bg-transparent"
          onClick={() => {
            void (async () => {
              const id = useBroadcastStore.getState().editingThemeId
              const theme = id
                ? useBroadcastStore.getState().themes.find((t) => t.id === id)
                : null
              if (theme) {
                try {
                  await exportTheme(theme)
                } catch (err) {
                  console.error("[theme-library] export failed:", err)
                }
              }
            })()
          }}
        >
          <DownloadIcon className="size-2.5" />
          Export
        </Button>
      </div>

      {/* Theme list */}
      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="flex min-w-0 flex-col gap-1 overflow-x-hidden px-2 pb-4">
          {/* Built-in section */}
          {builtinThemes.length > 0 && (
            <>
              <p className="px-1.5 pt-2 pb-1 text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                Built-in
              </p>
              {builtinThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  activeSection={selectedThemeSection}
                  isActive={theme.id === activeThemeId}
                  isEditing={theme.id === editingThemeId}
                  onDragStart={() => setDraggedThemeId(theme.id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    reorderVisibleThemes(theme.id)
                  }}
                  onDragEnd={() => setDraggedThemeId(null)}
                  onSelect={() =>
                    useBroadcastStore.getState().startEditing(theme.id)
                  }
                />
              ))}
            </>
          )}

          {/* Custom section */}
          {customThemes.length > 0 && (
            <>
              <p className="px-1.5 pt-3 pb-1 text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                Custom
              </p>
              {customThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  activeSection={selectedThemeSection}
                  isActive={theme.id === activeThemeId}
                  isEditing={theme.id === editingThemeId}
                  onDragStart={() => setDraggedThemeId(theme.id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    reorderVisibleThemes(theme.id)
                  }}
                  onDragEnd={() => setDraggedThemeId(null)}
                  onSelect={() =>
                    useBroadcastStore.getState().startEditing(theme.id)
                  }
                />
              ))}
            </>
          )}

          {filteredThemes.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              No themes found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
