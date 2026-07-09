import type { CopSong } from "./cop-songs"

let cache: CopSong[] | null = null
let inflight: Promise<CopSong[]> | null = null
const EASYWORSHIP_STORAGE_KEY = "fellowshow.easyworship-songs.v1"

function loadEasyWorshipSongs(): CopSong[] {
  try {
    const value = localStorage.getItem(EASYWORSHIP_STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? (parsed as CopSong[]) : []
  } catch {
    return []
  }
}

export function saveEasyWorshipSongs(songs: CopSong[]) {
  localStorage.setItem(EASYWORSHIP_STORAGE_KEY, JSON.stringify(songs))
  cache = cache
    ? [...cache.filter((song) => song.source !== "easyworship"), ...songs]
    : null
}

/**
 * Lazily load the full song catalog. The data is split into separate async
 * chunks (cop-songs.json + imported-songs.json) so it stays out of the initial
 * bundle and is fetched only when the song search is first used. Result is
 * cached, and concurrent callers share a single in-flight request.
 */
export async function loadAllSongs(): Promise<CopSong[]> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = Promise.all([
    import("./cop-songs.json"),
    import("./imported-songs.json"),
  ])
    .then(([cop, imported]) => {
      cache = [
        ...(cop.default as unknown as CopSong[]),
        ...(imported.default as unknown as CopSong[]),
        ...loadEasyWorshipSongs(),
      ]
      return cache
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
