import { load, type Store } from "@tauri-apps/plugin-store"
import type { CopSong } from "./cop-songs"
import copSongsUrl from "./cop-songs.json?url"
import importedSongsUrl from "./imported-songs.json?url"

let cache: CopSong[] | null = null
let inflight: Promise<CopSong[]> | null = null
// Older builds kept EasyWorship songs in localStorage, which caps out near
// 5 MB. They now live in an app-data file with no practical size limit.
const LEGACY_EASYWORSHIP_STORAGE_KEY = "fellowshow.easyworship-songs.v1"
const SONG_LIBRARY_FILE = "song-library.json"
const EASYWORSHIP_KEY = "easyworshipSongs"
const CUSTOM_SONGS_KEY = "customSongs"
// Title and lyric changes to built-in or imported songs, keyed by song id, so
// they survive an EasyWorship re-import and can be reset.
const SONG_EDITS_KEY = "songEdits"
const MY_SONGS_LABEL = "My songs"

interface SongEdit {
  title: string
  lyrics: string
}
let libraryStore: Promise<Store> | null = null

function getLibraryStore(): Promise<Store> {
  libraryStore ??= load(SONG_LIBRARY_FILE, { autoSave: false, defaults: {} })
  return libraryStore
}

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
          "custom",
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

function readLegacyEasyWorshipSongs(): CopSong[] {
  try {
    const value = localStorage.getItem(LEGACY_EASYWORSHIP_STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter(isSong) : []
  } catch {
    return []
  }
}

async function loadEasyWorshipSongs(): Promise<CopSong[]> {
  try {
    const store = await getLibraryStore()
    const stored = await store.get<unknown>(EASYWORSHIP_KEY)
    if (Array.isArray(stored)) return stored.filter(isSong)

    const legacy = readLegacyEasyWorshipSongs()
    if (legacy.length > 0) {
      await store.set(EASYWORSHIP_KEY, legacy)
      await store.save()
      localStorage.removeItem(LEGACY_EASYWORSHIP_STORAGE_KEY)
    }
    return legacy
  } catch {
    // Outside the desktop app there is no store; fall back to the old copy.
    return readLegacyEasyWorshipSongs()
  }
}

export async function saveEasyWorshipSongs(songs: CopSong[]): Promise<void> {
  const store = await getLibraryStore()
  await store.set(EASYWORSHIP_KEY, songs)
  await store.save()
  localStorage.removeItem(LEGACY_EASYWORSHIP_STORAGE_KEY)
  cache = null
}

function sanitizeSongEdits(value: unknown): Record<string, SongEdit> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const edits: Record<string, SongEdit> = {}
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue
    const { title, lyrics } = raw as Record<string, unknown>
    if (typeof title === "string" && typeof lyrics === "string") {
      edits[id] = { title, lyrics }
    }
  }
  return edits
}

async function readLibraryValue(key: string): Promise<unknown> {
  try {
    const store = await getLibraryStore()
    return await store.get<unknown>(key)
  } catch {
    return undefined
  }
}

async function writeLibraryValue(key: string, value: unknown): Promise<void> {
  const store = await getLibraryStore()
  await store.set(key, value)
  await store.save()
  cache = null
}

async function loadCustomSongs(): Promise<CopSong[]> {
  const stored = await readLibraryValue(CUSTOM_SONGS_KEY)
  return Array.isArray(stored) ? stored.filter(isSong) : []
}

async function loadSongEdits(): Promise<Record<string, SongEdit>> {
  return sanitizeSongEdits(await readLibraryValue(SONG_EDITS_KEY))
}

function applySongEdits(
  songs: CopSong[],
  edits: Record<string, SongEdit>
): CopSong[] {
  return songs.map((song) => {
    const edit = edits[song.id]
    return edit ? { ...song, ...edit, edited: true } : song
  })
}

/** Adds a song the operator typed or pasted, and returns it. */
export async function createCustomSong(
  title: string,
  lyrics: string
): Promise<CopSong> {
  const song: CopSong = {
    id: `custom-${crypto.randomUUID()}`,
    language: "english",
    languageLabel: MY_SONGS_LABEL,
    number: 0,
    title: title.trim(),
    lyrics: lyrics.trim(),
    source: "custom",
    sourceLabel: MY_SONGS_LABEL,
  }
  await writeLibraryValue(CUSTOM_SONGS_KEY, [
    ...(await loadCustomSongs()),
    song,
  ])
  return song
}

/** Saves new title and lyrics for any song and returns the updated song. */
export async function updateSong(
  song: CopSong,
  title: string,
  lyrics: string
): Promise<CopSong> {
  const next = { title: title.trim(), lyrics: lyrics.trim() }
  if (song.source === "custom") {
    const songs = await loadCustomSongs()
    await writeLibraryValue(
      CUSTOM_SONGS_KEY,
      songs.map((item) => (item.id === song.id ? { ...item, ...next } : item))
    )
    return { ...song, ...next }
  }
  const edits = await loadSongEdits()
  await writeLibraryValue(SONG_EDITS_KEY, { ...edits, [song.id]: next })
  return { ...song, ...next, edited: true }
}

/** Drops the operator's edits so a built-in or imported song reads as shipped. */
export async function resetSongEdits(songId: string): Promise<void> {
  const edits = await loadSongEdits()
  delete edits[songId]
  await writeLibraryValue(SONG_EDITS_KEY, edits)
}

export async function deleteCustomSong(songId: string): Promise<void> {
  const songs = await loadCustomSongs()
  await writeLibraryValue(
    CUSTOM_SONGS_KEY,
    songs.filter((song) => song.id !== songId)
  )
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
    loadEasyWorshipSongs(),
    loadCustomSongs(),
    loadSongEdits(),
  ])
    .then(([cop, imported, easyWorship, custom, edits]) => {
      cache = applySongEdits(
        [...cop, ...imported, ...easyWorship, ...custom],
        edits
      )
      return cache
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
