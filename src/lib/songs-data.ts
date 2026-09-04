import type { CopSong } from "./cop-songs"
import copSongsUrl from "./cop-songs.json?url"
import importedSongsUrl from "./imported-songs.json?url"

let cache: CopSong[] | null = null
let inflight: Promise<CopSong[]> | null = null
const EASYWORSHIP_STORAGE_KEY = "fellowshow.easyworship-songs.v1"

function isSong(value: unknown): value is CopSong {
  if (typeof value !== "object" || value === null) return false
  const song = value as Record<string, unknown>
  return (
    typeof song.id === "string" &&
    typeof song.title === "string" &&
    typeof song.lyrics === "string" &&
    typeof song.languageLabel === "string" &&
    (song.language === "english" || song.language === "twi") &&
    typeof song.number === "number" &&
    Number.isFinite(song.number) &&
    (song.source === undefined ||
      (typeof song.source === "string" &&
        [
          "built-in",
          "theme-2026",
          "theme-2025",
          "pentecostal-book",
          "easyworship",
        ].includes(song.source))) &&
    (song.sourceLabel === undefined || typeof song.sourceLabel === "string")
  )
}

async function loadCatalog(url: string): Promise<CopSong[]> {
  const response = await fetch(url)
  if (!response.ok)
    throw new Error(
      `Could not load the bundled song catalog: HTTP ${response.status}`
    )
  const data: unknown = await response.json()
  if (!Array.isArray(data) || !data.every(isSong))
    throw new Error("The bundled song catalog is invalid")
  return data
}

function loadEasyWorshipSongs(): CopSong[] {
  try {
    const value = localStorage.getItem(EASYWORSHIP_STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter(isSong) : []
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
 * JSON assets so it stays out of executable JavaScript and is fetched locally
 * only when the song search is first used. Result is
 * cached, and concurrent callers share a single in-flight request.
 */
export async function loadAllSongs(): Promise<CopSong[]> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = Promise.all([
    loadCatalog(copSongsUrl),
    loadCatalog(importedSongsUrl),
  ])
    .then(([cop, imported]) => {
      cache = [...cop, ...imported, ...loadEasyWorshipSongs()]
      return cache
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
