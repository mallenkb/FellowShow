import { useCallback, useEffect, useMemo, useState } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import {
  BookOpenIcon,
  ImageIcon,
  LayersIcon,
  MegaphoneIcon,
  MusicIcon,
  TimerIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { OnDisplayOverview } from "@/components/on-display/on-display-overview"
import { AnnouncementsTab } from "@/components/panels/search/announcements-tab"
import { PresentationSearchTab } from "@/components/panels/search/presentation-search-tab"
import { ScriptureSearchTab } from "@/components/panels/search/scripture-search-tab"
import type { ScriptureSearchMode } from "@/components/panels/search/use-scripture-search"
import { SongFilterDropdown } from "@/components/panels/search/song-filter-dropdown"
import { SongsTab } from "@/components/panels/search/songs-tab"
import { TimerTab } from "@/components/panels/search/timer-tab"
import { useSongSearch } from "@/components/panels/search/use-song-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CopSong } from "@/lib/cop-songs"
import { useSongFilterStore } from "@/stores/song-filter-store"
import { invoke } from "@/lib/ipc"
import { prepareSong, presentSong } from "@/lib/song-presentation"
import { loadAllSongs, saveEasyWorshipSongs } from "@/lib/songs-data"
import { cn } from "@/lib/utils"
import { useQueueStore } from "@/stores"

type SearchTab =
  | "book"
  | "context"
  | "songs"
  | "announcements"
  | "presentation"
  | "timer"
  | "on-display"
const SONG_PAGE_SIZE = 50

export function SearchPanel({
  onSearchModeChange,
}: {
  onSearchModeChange?: (mode: SearchTab) => void
}) {
  const [activeTab, setActiveTab] = useState<SearchTab>("book")
  const [scriptureMode, setScriptureMode] =
    useState<ScriptureSearchMode>("book")
  const [songQuery, setSongQuery] = useState("")
  const songLetterFilter = useSongFilterStore((s) => s.letter)
  const songSourceFilter = useSongFilterStore((s) => s.source)
  const setSongLetterFilter = useSongFilterStore((s) => s.setLetter)
  const setSongSourceFilter = useSongFilterStore((s) => s.setSource)
  const [songRenderLimit, setSongRenderLimit] = useState(SONG_PAGE_SIZE)
  const [allSongs, setAllSongs] = useState<CopSong[]>([])
  const songSearchKey = `${songQuery}\u0000${songSourceFilter}\u0000${songLetterFilter}`
  const [previousSongSearchKey, setPreviousSongSearchKey] =
    useState(songSearchKey)

  if (previousSongSearchKey !== songSearchKey) {
    setPreviousSongSearchKey(songSearchKey)
    setSongRenderLimit(SONG_PAGE_SIZE)
  }

  const queueItems = useQueueStore((state) => state.items)
  const activeSongItem =
    queueItems.find((item) => item.lyricKind === "song") ?? null

  const setSearchTab = useCallback((tab: SearchTab) => {
    setActiveTab(tab)
    if (tab === "book" || tab === "context") {
      setScriptureMode(tab)
    }
  }, [])

  useEffect(() => {
    onSearchModeChange?.(activeTab)
  }, [activeTab, onSearchModeChange])

  useEffect(() => {
    if (allSongs.length > 0) return
    let active = true
    void loadAllSongs()
      .then((songs) => {
        if (active) setAllSongs(songs)
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
    letter: songLetterFilter,
    renderLimit: songRenderLimit,
  })

  const importEasyWorshipSongs = useCallback(async () => {
    if (!isTauri()) {
      toast.error("EasyWorship imports are available in the desktop app.")
      return
    }

    const selected = await open({
      multiple: true,
      filters: [{ name: "EasyWorship databases", extensions: ["db"] }],
    })
    if (!selected) return

    const paths = Array.isArray(selected) ? selected : [selected]
    const songsDbPath = paths.find((path) => /(^|[/\\])songs\.db$/i.test(path))
    const songWordsDbPath = paths.find((path) =>
      /(^|[/\\])songwords\.db$/i.test(path)
    )
    if (!songsDbPath || !songWordsDbPath) {
      toast.error("Choose both Songs.db and SongWords.db from EasyWorship.")
      return
    }

    try {
      const imported = await invoke("import_easyworship_songs", {
        songsDbPath,
        songWordsDbPath,
      })
      const songs: CopSong[] = imported.map((song, index) => ({
        id: song.id,
        language: "english",
        languageLabel: "EasyWorship",
        number: index + 1,
        title: song.title,
        lyrics: song.lyrics,
        source: "easyworship",
        sourceLabel: "EasyWorship",
      }))
      saveEasyWorshipSongs(songs)
      setAllSongs(await loadAllSongs())
      toast.success(
        `Imported ${songs.length} song${songs.length === 1 ? "" : "s"} from EasyWorship.`
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not import EasyWorship songs."
      )
    }
  }, [])

  const tabButtonClass = (tab: SearchTab) =>
    cn(
      "flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
      activeTab === tab
        ? "border-[#101084]/50 bg-[#101084]/15 text-[#101084] dark:border-[#F1E600]/50 dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
        : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40"
    )

  const tabIconClass = (tab: SearchTab) =>
    cn(
      "size-3.5",
      activeTab === tab
        ? "text-[#101084] dark:text-[#F1E600]"
        : "text-muted-foreground"
    )

  const tabs = useMemo(
    () => [
      {
        id: "book" as const,
        label: "Sermon",
        icon: BookOpenIcon,
        tour: "book-search",
      },
      { id: "songs" as const, label: "Songs", icon: MusicIcon },
      {
        id: "presentation" as const,
        label: "Presentations",
        icon: ImageIcon,
      },
      {
        id: "on-display" as const,
        label: "Video Overlays",
        icon: LayersIcon,
      },
      { id: "timer" as const, label: "Timer", icon: TimerIcon },
      {
        id: "announcements" as const,
        label: "Announcements",
        icon: MegaphoneIcon,
      },
    ],
    []
  )

  const isScriptureActive = activeTab === "book" || activeTab === "context"

  return (
    <div
      data-slot="search-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors outline-none"
    >
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-3 pt-2 pb-3">
        <div className="-mx-1 flex min-w-0 [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
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
                aria-pressed={activeTab === tab.id}
              >
                <Icon className={tabIconClass(tab.id)} />
                <span className="search-tab-label">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {activeTab === "songs" ? (
          <div className="flex min-w-0 items-center gap-2">
            <Input
              placeholder="Title, lyrics, or topic..."
              value={songQuery}
              onChange={(event) => setSongQuery(event.target.value)}
              className="h-10 min-w-0 flex-1 text-sm"
            />
            <SongFilterDropdown
              sourceValue={songSourceFilter}
              letterValue={songLetterFilter}
              onSourceChange={setSongSourceFilter}
              onLetterChange={setSongLetterFilter}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => void importEasyWorshipSongs()}
              title="Import EasyWorship songs"
              aria-label="Import EasyWorship songs"
            >
              <UploadIcon className="size-4" />
            </Button>
          </div>
        ) : activeTab === "announcements" ? (
          <TabDescription>
            Choose a set and item, then edit it in the workspace
          </TabDescription>
        ) : activeTab === "timer" ? (
          <TabDescription>Timer controls</TabDescription>
        ) : activeTab === "on-display" ? (
          <TabDescription>
            Video Overlays · logo, scrolling text, and lower thirds
          </TabDescription>
        ) : null}
      </div>

      <ScriptureSearchTab
        mode={scriptureMode}
        isActive={isScriptureActive}
        onRequestMode={setSearchTab}
      />

      {activeTab === "songs" ? (
        <SongsTab
          songs={visibleSongs}
          totalCount={songResultCount}
          hiddenCount={hiddenSongCount}
          isSearching={isSongSearching}
          activeSongId={activeSongItem?.id ?? null}
          query={effectiveSongQuery}
          onOpenSong={prepareSong}
          onPresentSong={presentSong}
          formatReference={(song) => song.title}
          onLoadMore={() =>
            setSongRenderLimit((limit) => limit + SONG_PAGE_SIZE)
          }
        />
      ) : null}

      <PresentationSearchTab isActive={activeTab === "presentation"} />
      {activeTab === "announcements" ? <AnnouncementsTab /> : null}
      {activeTab === "on-display" ? <OnDisplayOverview /> : null}
      {activeTab === "timer" ? <TimerTab /> : null}
    </div>
  )
}

function TabDescription({ children }: { children: string }) {
  return (
    <div className="flex h-10 items-center">
      <span className="text-xs font-medium text-muted-foreground">
        {children}
      </span>
    </div>
  )
}
