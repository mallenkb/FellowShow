import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import type { CopSong } from "@/lib/cop-songs"
import { compareSongPdfOrder } from "@/lib/song-ordering"
import { createSongSearchIndex, searchSongs } from "@/lib/song-search"

interface SongSearchWorkerResponse {
  type: "ready" | "results"
  requestId?: number
  searchKey?: string
  query?: string
  songIds?: string[]
}

interface SongSearchResult {
  songs: CopSong[]
  totalCount: number
  hiddenCount: number
  effectiveQuery: string
  isSearching: boolean
}

const WORKER_SUPPORTED = typeof Worker !== "undefined"

export function useSongSearch({
  songs,
  query,
  source,
  letter,
  renderLimit,
}: {
  songs: CopSong[]
  query: string
  source: string
  letter: string
  renderLimit: number
}): SongSearchResult {
  const orderedSongs = useMemo(
    () => [...songs].sort(compareSongPdfOrder),
    [songs]
  )
  const songById = useMemo(
    () => new Map(orderedSongs.map((song) => [song.id, song])),
    [orderedSongs]
  )
  const deferredQuery = useDeferredValue(query)
  const isSearchActive = deferredQuery.trim().length > 0
  const activeSearchKey = `${deferredQuery}\u0000${source}\u0000${letter}`
  const workerRef = useRef<Worker | null>(null)
  const latestRequestIdRef = useRef(0)
  const [workerReady, setWorkerReady] = useState(false)
  const [workerFailed, setWorkerFailed] = useState(false)
  const [workerResult, setWorkerResult] = useState<{
    searchKey: string
    query: string
    songIds: string[]
  } | null>(null)
  const useSynchronousFallback = !WORKER_SUPPORTED || workerFailed

  // Reset worker state when the song list changes (adjust-during-render
  // pattern, so the effect below doesn't set state synchronously).
  const [prevOrderedSongs, setPrevOrderedSongs] = useState(orderedSongs)
  if (prevOrderedSongs !== orderedSongs) {
    setPrevOrderedSongs(orderedSongs)
    setWorkerReady(false)
    setWorkerResult(null)
    setWorkerFailed(false)
  }

  useEffect(() => {
    if (orderedSongs.length === 0 || !WORKER_SUPPORTED) return

    const worker = new Worker(
      new URL("../../../workers/song-search.worker.ts", import.meta.url),
      { type: "module" }
    )
    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<SongSearchWorkerResponse>) => {
      const response = event.data
      if (response.type === "ready") {
        setWorkerReady(true)
        return
      }
      if (
        response.requestId !== latestRequestIdRef.current ||
        response.searchKey == null ||
        response.query == null ||
        response.songIds == null
      ) {
        return
      }
      setWorkerResult({
        searchKey: response.searchKey,
        query: response.query,
        songIds: response.songIds,
      })
    }
    worker.onerror = () => {
      worker.terminate()
      workerRef.current = null
      setWorkerReady(false)
      setWorkerFailed(true)
    }
    worker.postMessage({ type: "initialize", songs: orderedSongs })

    return () => {
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = null
    }
  }, [orderedSongs])

  useEffect(() => {
    if (!isSearchActive || !workerReady || !workerRef.current) return

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    const timeoutId = setTimeout(() => {
      workerRef.current?.postMessage({
        type: "search",
        requestId,
        searchKey: activeSearchKey,
        query: deferredQuery,
        source,
        letter,
      })
    }, 25)

    return () => clearTimeout(timeoutId)
  }, [
    activeSearchKey,
    deferredQuery,
    isSearchActive,
    letter,
    renderLimit,
    source,
    workerReady,
  ])

  const fallbackIndex = useMemo(
    () => (useSynchronousFallback ? createSongSearchIndex(orderedSongs) : null),
    [orderedSongs, useSynchronousFallback]
  )
  // Keep this new hook after the established search hooks so Fast Refresh
  // does not reinterpret an existing hook value while the app is running.
  const alphabetizedSongs = useMemo(
    () =>
      [...songs].sort((left, right) =>
        left.title.localeCompare(right.title, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [songs]
  )

  return useMemo(() => {
    if (!isSearchActive) {
      const filtered =
        source === "all" && letter === "all"
          ? alphabetizedSongs
          : alphabetizedSongs.filter(
              (song) =>
                (source === "all" || song.source === source) &&
                (letter === "all" ||
                  song.title.trim().toUpperCase().startsWith(letter))
            )
      return {
        songs: filtered.slice(0, renderLimit),
        totalCount: filtered.length,
        hiddenCount: Math.max(0, filtered.length - renderLimit),
        effectiveQuery: "",
        isSearching: false,
      }
    }

    if (fallbackIndex) {
      const matches = searchSongs(fallbackIndex, deferredQuery, {
        source,
        letter,
      })
      return {
        songs: matches.slice(0, renderLimit),
        totalCount: matches.length,
        hiddenCount: Math.max(0, matches.length - renderLimit),
        effectiveQuery: deferredQuery,
        isSearching: false,
      }
    }

    const resultSongs =
      workerResult?.songIds.flatMap((id) => {
        const song = songById.get(id)
        return song ? [song] : []
      }) ?? []
    return {
      songs: resultSongs.slice(0, renderLimit),
      totalCount: resultSongs.length,
      hiddenCount: Math.max(0, resultSongs.length - renderLimit),
      effectiveQuery: workerResult?.query ?? deferredQuery,
      isSearching:
        !workerReady ||
        workerResult == null ||
        workerResult.searchKey !== activeSearchKey,
    }
  }, [
    activeSearchKey,
    alphabetizedSongs,
    deferredQuery,
    fallbackIndex,
    isSearchActive,
    letter,
    renderLimit,
    songById,
    source,
    workerReady,
    workerResult,
  ])
}
