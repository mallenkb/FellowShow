import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react"
import { createPortal } from "react-dom"
import {
  BookOpenIcon,
  ImageIcon,
  LayersIcon,
  MusicIcon,
  PlusIcon,
  NotebookTextIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { OnDisplayOverview } from "@/components/on-display/on-display-overview"
import { AnnouncementsTab } from "@/components/panels/search/announcements-tab"
import { PresentationSearchTab } from "@/components/panels/search/presentation-search-tab"
import { ScriptureSearchTab } from "@/components/panels/search/scripture-search-tab"
import type { ScriptureSearchMode } from "@/components/panels/search/use-scripture-search"
import { SongFilterDropdown } from "@/components/panels/search/song-filter-dropdown"
import { SongsTab } from "@/components/panels/search/songs-tab"
import { useSongSearch } from "@/components/panels/search/use-song-search"
import { useSearchShortcut } from "@/components/panels/search/use-search-shortcut"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CopSong } from "@/lib/cop-songs"
import { useSongFilterStore } from "@/stores/song-filter-store"
import { prepareSong, presentSong } from "@/lib/song-presentation"
import { loadAllSongs } from "@/lib/songs-data"
import { cn } from "@/lib/utils"
import { useQueueStore } from "@/stores"
import { useSongEditorStore } from "@/stores/song-editor-store"
import { SongEditorDialog } from "@/components/songs/song-editor-dialog"
import { EasyWorshipImportButton } from "@/components/songs/easyworship-import-button"
import { EasyWorshipRemoveDialog } from "@/components/songs/easyworship-remove-dialog"
import { isOptionalSearchTab, useSettingsStore } from "@/stores/settings-store"

type SearchTab =
  "book" | "context" | "songs" | "announcements" | "presentation" | "on-display"
const SONG_PAGE_SIZE = 50

interface SearchTabOption {
  id: SearchTab
  label: string
  icon: LucideIcon
  tour?: string
}

export function SearchPanel({
  onSearchModeChange,
  navigationTarget,
}: {
  onSearchModeChange?: (mode: SearchTab) => void
  navigationTarget?: HTMLElement | null
}) {
  const [selectedTab, setSelectedTab] = useState<SearchTab>("book")
  const extraSearchTabs = useSettingsStore((state) => state.extraSearchTabs)
  // A tab hidden in Settings while it is open falls back to Sermon.
  const activeTab =
    isOptionalSearchTab(selectedTab) && !extraSearchTabs.includes(selectedTab)
      ? "book"
      : selectedTab
  const [scriptureMode, setScriptureMode] =
    useState<ScriptureSearchMode>("book")
  const [songQuery, setSongQuery] = useState("")
  const songSourceFilter = useSongFilterStore((s) => s.source)
  const setSongSourceFilter = useSongFilterStore((s) => s.setSource)
  const [songRenderLimit, setSongRenderLimit] = useState(SONG_PAGE_SIZE)
  const [songHighlight, setSongHighlight] = useState(0)
  const [songSearchFocused, setSongSearchFocused] = useState(false)
  const [allSongs, setAllSongs] = useState<CopSong[]>([])
  const [songsLoaded, setSongsLoaded] = useState(false)
  const [confirmingEasyWorshipRemoval, setConfirmingEasyWorshipRemoval] =
    useState(false)
  const easyWorshipSongCount = useMemo(
    () => allSongs.filter((song) => song.source === "easyworship").length,
    [allSongs]
  )
  const songSources = useMemo(() => {
    const sources = new Map<
      Exclude<CopSong["source"], undefined | "built-in">,
      string
    >()
    for (const song of allSongs) {
      if (song.source && song.source !== "built-in") {
        sources.set(song.source, song.sourceLabel ?? song.languageLabel)
      }
    }
    return [...sources].map(([value, label]) => ({ value, label }))
  }, [allSongs])
  useEffect(() => {
    if (
      songsLoaded &&
      songSourceFilter !== "all" &&
      !songSources.some((item) => item.value === songSourceFilter)
    ) {
      setSongSourceFilter("all")
    }
  }, [songsLoaded, songSourceFilter, songSources, setSongSourceFilter])
  const songSearchKey = `${songQuery}\u0000${songSourceFilter}`
  const [previousSongSearchKey, setPreviousSongSearchKey] =
    useState(songSearchKey)

  if (previousSongSearchKey !== songSearchKey) {
    setPreviousSongSearchKey(songSearchKey)
    setSongRenderLimit(SONG_PAGE_SIZE)
    setSongHighlight(0)
  }

  const catalogVersion = useSongEditorStore((state) => state.catalogVersion)

  // Reload the list after a song is added, edited, reset, or deleted.
  useEffect(() => {
    if (catalogVersion === 0) return
    let active = true
    void loadAllSongs()
      .then((songs) => {
        if (active) {
          setAllSongs(songs)
          setSongsLoaded(true)
        }
      })
      .catch(() => toast.error("Could not reload songs."))
    return () => {
      active = false
    }
  }, [catalogVersion])

  const queueItems = useQueueStore((state) => state.items)
  const activeSongItem =
    queueItems.find((item) => item.lyricKind === "song") ?? null

  const setSearchTab = useCallback((tab: SearchTab) => {
    setSelectedTab(tab)
    if (tab !== "songs") setSongSearchFocused(false)
    if (tab === "book" || tab === "context") {
      setScriptureMode(tab)
    }
  }, [])

  const { scriptureSearchRef, songSearchRef } = useSearchShortcut(
    activeTab,
    setSearchTab
  )

  useEffect(() => {
    onSearchModeChange?.(activeTab)
  }, [activeTab, onSearchModeChange])

  useEffect(() => {
    if (allSongs.length > 0) return
    let active = true
    void loadAllSongs()
      .then((songs) => {
        if (active) {
          setAllSongs(songs)
          setSongsLoaded(true)
        }
      })
      .catch((error) => {
        console.warn("[songs] Could not prepare song catalog", error)
        toast.error("Could not load songs. Reopen the Songs tab to retry.")
      })
    return () => {
      active = false
    }
  }, [activeTab, allSongs.length])

  const {
    songs: visibleSongs,
    totalCount: songResultCount,
    hiddenCount: hiddenSongCount,
    effectiveQuery: effectiveSongQuery,
    isSearching: isSongSearching,
  } = useSongSearch({
    songs: allSongs,
    query: songQuery,
    source: songSourceFilter,
    renderLimit: songRenderLimit,
  })

  // Clicking only prepares a song. Taking it live is a deliberate second Enter.
  const openSong = (song: CopSong, index: number) => {
    setSongHighlight(index)
    prepareSong(song)
  }

  const handleSongKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      const next = Math.min(songHighlight + 1, visibleSongs.length - 1)
      if (next >= visibleSongs.length - 5 && hiddenSongCount > 0) {
        setSongRenderLimit((limit) => limit + SONG_PAGE_SIZE)
      }
      setSongHighlight(Math.max(0, next))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setSongHighlight(Math.max(0, songHighlight - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const song = visibleSongs[songHighlight]
      if (!song) return
      if (activeSongItem?.id === `song:${song.id}`) presentSong(song)
      else prepareSong(song)
    } else if (event.key === "Escape" && songQuery) {
      event.preventDefault()
      setSongQuery("")
    }
  }

  const isTabActive = (tab: SearchTab) =>
    tab === "book"
      ? activeTab === "book" || activeTab === "context"
      : activeTab === tab
  const isHeaderNavigation = navigationTarget !== undefined

  const tabButtonClass = (tab: SearchTab) =>
    cn(
      "search-tab flex shrink-0 items-center gap-1.5 border text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      isHeaderNavigation
        ? "h-8 rounded-[calc(var(--workspace-nav-radius,10px)_-_4px)] px-3"
        : "h-7 rounded-md px-2.5",
      isTabActive(tab)
        ? isHeaderNavigation
          ? "border-transparent bg-card text-secondary-foreground dark:bg-secondary"
          : "border-primary-emphasis/50 bg-primary/15 text-primary-emphasis"
        : isHeaderNavigation
          ? "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40"
    )

  const tabIconClass = (tab: SearchTab) =>
    cn(
      "size-3.5",
      isTabActive(tab) ? "text-primary-emphasis" : "text-muted-foreground"
    )

  const tabs = useMemo((): SearchTabOption[] => {
    const extraTabs: SearchTabOption[] = [
      {
        id: "on-display" as const,
        label: "Video Overlays",
        icon: LayersIcon,
      },
    ].filter(
      (tab) => isOptionalSearchTab(tab.id) && extraSearchTabs.includes(tab.id)
    )
    return [
      {
        id: "book" as const,
        label: "Bible",
        icon: BookOpenIcon,
        tour: "book-search",
      },
      { id: "songs" as const, label: "Songs", icon: MusicIcon },
      {
        id: "announcements" as const,
        label: "Notes",
        icon: NotebookTextIcon,
      },
      { id: "presentation" as const, label: "Media", icon: ImageIcon },
      ...extraTabs,
    ]
  }, [extraSearchTabs])

  const isScriptureActive = activeTab === "book" || activeTab === "context"
  const headerHasControls = activeTab === "songs"
  const navigation = (
    <nav
      aria-label="Workspaces"
      className={cn(
        "flex min-w-0 items-center",
        isHeaderNavigation ? "gap-0" : "gap-1"
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            data-tour={tab.tour}
            onClick={() => setSearchTab(tab.id)}
            className={tabButtonClass(tab.id)}
            title={tab.label}
            aria-label={tab.label}
            aria-pressed={isTabActive(tab.id)}
          >
            {isHeaderNavigation ? null : (
              <Icon className={tabIconClass(tab.id)} />
            )}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <div
      data-slot="search-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card transition-colors outline-none"
    >
      {navigationTarget ? createPortal(navigation, navigationTarget) : null}
      <div
        className={cn(
          "flex shrink-0 flex-col gap-2.5",
          navigationTarget === undefined || headerHasControls
            ? "bg-muted/40 px-3 pt-2"
            : "hidden",
          headerHasControls ? "pb-3" : "pb-0"
        )}
      >
        {navigationTarget === undefined ? navigation : null}

        {activeTab === "songs" ? (
          <div className="flex min-w-0 items-center gap-2">
            <Input
              ref={songSearchRef}
              placeholder="Search songs · ↑↓ then Enter"
              aria-label="Search songs"
              aria-keyshortcuts="/"
              value={songQuery}
              onChange={(event) => setSongQuery(event.target.value)}
              onFocus={() => setSongSearchFocused(true)}
              onBlur={() => setSongSearchFocused(false)}
              onKeyDown={handleSongKeyDown}
              className="h-10 min-w-0 flex-1 text-sm"
            />
            <SongFilterDropdown
              sourceValue={songSourceFilter}
              onSourceChange={setSongSourceFilter}
              sources={songSources}
              onRemoveEasyWorship={
                easyWorshipSongCount > 0
                  ? () => setConfirmingEasyWorshipRemoval(true)
                  : undefined
              }
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => useSongEditorStore.getState().openNew(songQuery)}
              title="New song"
              aria-label="New song"
            >
              <PlusIcon className="size-4" />
            </Button>
            <EasyWorshipImportButton
              importedCount={easyWorshipSongCount}
              onSongsChanged={(songs) => {
                setAllSongs(songs)
                setSongQuery("")
              }}
              onRequestRemove={() => setConfirmingEasyWorshipRemoval(true)}
            />
            <EasyWorshipRemoveDialog
              open={confirmingEasyWorshipRemoval}
              onOpenChange={setConfirmingEasyWorshipRemoval}
              songCount={easyWorshipSongCount}
              onSongsChanged={setAllSongs}
            />
          </div>
        ) : null}
      </div>

      <ScriptureSearchTab
        mode={scriptureMode}
        isActive={isScriptureActive}
        onRequestMode={setSearchTab}
        searchInputRef={scriptureSearchRef}
      />

      {activeTab === "songs" ? (
        <SongsTab
          songs={visibleSongs}
          totalCount={songResultCount}
          hiddenCount={hiddenSongCount}
          isSearching={isSongSearching}
          activeSongId={activeSongItem?.id ?? null}
          query={effectiveSongQuery}
          highlightIndex={songSearchFocused ? songHighlight : -1}
          onEditSong={(song) => useSongEditorStore.getState().openEdit(song.id)}
          onAddSong={() => useSongEditorStore.getState().openNew(songQuery)}
          showSource={songSourceFilter === "all"}
          onOpenSong={openSong}
          onPresentSong={(song, index) => {
            setSongHighlight(index)
            presentSong(song)
          }}
          formatReference={(song) => song.title}
          onLoadMore={() =>
            setSongRenderLimit((limit) => limit + SONG_PAGE_SIZE)
          }
        />
      ) : null}

      <SongEditorDialog />
      <PresentationSearchTab isActive={activeTab === "presentation"} />
      {activeTab === "announcements" ? <AnnouncementsTab /> : null}
      {activeTab === "on-display" ? <OnDisplayOverview /> : null}
    </div>
  )
}
