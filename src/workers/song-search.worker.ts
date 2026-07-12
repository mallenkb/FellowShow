import type { CopSong } from "@/lib/cop-songs"
import {
  createSongSearchIndex,
  searchSongs,
  type SongSearchIndex,
} from "@/lib/song-search"

type WorkerRequest =
  | { type: "initialize"; songs: CopSong[] }
  | {
      type: "search"
      requestId: number
      searchKey: string
      query: string
      source: string
      letter: string
      limit: number
    }

type WorkerResponse =
  | { type: "ready" }
  | {
      type: "results"
      requestId: number
      searchKey: string
      query: string
      songIds: string[]
    }

let searchIndex: SongSearchIndex<CopSong> | null = null

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  if (request.type === "initialize") {
    searchIndex = createSongSearchIndex(request.songs)
    self.postMessage({ type: "ready" } satisfies WorkerResponse)
    return
  }

  if (!searchIndex) return

  const matches = searchSongs(searchIndex, request.query, {
    source: request.source,
    letter: request.letter,
    limit: request.limit,
  })
  self.postMessage({
    type: "results",
    requestId: request.requestId,
    searchKey: request.searchKey,
    query: request.query,
    songIds: matches.map((song) => song.id),
  } satisfies WorkerResponse)
}
