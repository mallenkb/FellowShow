import { load, type Store } from "@tauri-apps/plugin-store"
import type { CopSong } from "./cop-songs"

let cache: CopSong[] | null = null
let inflight: Promise<CopSong[]> | null = null
// Bumped on every write so a load that started earlier cannot overwrite the
// cache with songs from before the write.
let generation = 0
// Older builds kept EasyWorship songs in localStorage, which caps out near
// 5 MB. They now live in an app-data file with no practical size limit.
const LEGACY_EASYWORSHIP_STORAGE_KEY = "fellowshow.easyworship-songs.v1"
const SONG_LIBRARY_FILE = "song-library.json"
const SONG_LIBRARY_VERSION = 1
const VERSION_KEY = "version"
const EASYWORSHIP_KEY = "easyworshipSongs"
const CUSTOM_SONGS_KEY = "customSongs"
const COLLECTIONS_KEY = "songCollections"
const COLLECTION_VISIBILITY_KEY = "songCollectionVisibility"
// Title and lyric changes to built-in or imported songs, keyed by song id, so
// they survive an EasyWorship re-import and can be reset.
const SONG_EDITS_KEY = "songEdits"
const MY_SONGS_LABEL = "My songs"

interface SongEdit {
  title: string
  lyrics: string
}

export interface SongCollection {
  id: string
  name: string
  enabled: boolean
  songs: CopSong[]
}

export interface SongCollectionSummary {
  id: string
  name: string
  enabled: boolean
  count: number
  kind: "collection" | "easyworship" | "custom"
}
let libraryStore: Promise<Store> | null = null

function getLibraryStore(): Promise<Store> {
  // A failed load is not kept, so the next read or write tries again.
  libraryStore ??= load(SONG_LIBRARY_FILE, {
    autoSave: false,
    defaults: {},
  }).catch((error: unknown) => {
    libraryStore = null
    throw error
  })
  return libraryStore
}

/** Reads from the library file, ignoring files written by a newer version. */
async function readLibraryValue(key: string): Promise<unknown> {
  try {
    const store = await getLibraryStore()
    const version = await store.get<unknown>(VERSION_KEY)
    if (typeof version === "number" && version > SONG_LIBRARY_VERSION) {
      return undefined
    }
    return await store.get<unknown>(key)
  } catch {
    return undefined
  }
}

function invalidateSongs() {
  generation += 1
  cache = null
  inflight = null
}

async function writeLibraryValues(
  values: Record<string, unknown>
): Promise<void> {
  const store = await getLibraryStore()
  const version = await store.get<unknown>(VERSION_KEY)
  if (typeof version === "number" && version > SONG_LIBRARY_VERSION) {
    throw new Error(
      "This song library was created by a newer version of FellowShow."
    )
  }
  for (const [key, value] of Object.entries(values)) await store.set(key, value)
  await store.set(VERSION_KEY, SONG_LIBRARY_VERSION)
  await store.save()
  invalidateSongs()
}

async function writeLibraryValue(key: string, value: unknown): Promise<void> {
  await writeLibraryValues({ [key]: value })
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
        ([
          "built-in",
          "theme-2026",
          "theme-2025",
          "pentecostal-book",
          "easyworship",
          "custom",
        ].includes(song.source) ||
          song.source.startsWith("collection:")))) &&
    (song.sourceLabel === undefined || typeof song.sourceLabel === "string") &&
    (song.userCreated === undefined || typeof song.userCreated === "boolean")
  )
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
    const stored = await readLibraryValue(EASYWORSHIP_KEY)
    if (Array.isArray(stored)) return stored.filter(isSong)

    const legacy = readLegacyEasyWorshipSongs()
    if (legacy.length > 0) {
      const store = await getLibraryStore()
      await store.set(EASYWORSHIP_KEY, legacy)
      await store.set(VERSION_KEY, SONG_LIBRARY_VERSION)
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
  await writeLibraryValue(EASYWORSHIP_KEY, songs)
  localStorage.removeItem(LEGACY_EASYWORSHIP_STORAGE_KEY)
  await setVirtualCollectionEnabled("easyworship", true)
}

/** Deletes the imported EasyWorship library and the edits made to its songs. */
export async function removeEasyWorshipSongs(): Promise<void> {
  const ids = new Set((await loadEasyWorshipSongs()).map((song) => song.id))
  const edits = await loadSongEdits()
  for (const id of ids) delete edits[id]
  await writeLibraryValue(SONG_EDITS_KEY, edits)
  await saveEasyWorshipSongs([])
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

async function loadCustomSongs(): Promise<CopSong[]> {
  const stored = await readLibraryValue(CUSTOM_SONGS_KEY)
  return Array.isArray(stored) ? stored.filter(isSong) : []
}

export async function loadSongCollections(): Promise<SongCollection[]> {
  const stored = await readLibraryValue(COLLECTIONS_KEY)
  if (stored === undefined) return []
  if (!Array.isArray(stored))
    throw new Error("Could not read song collections.")
  const collections: SongCollection[] = []
  for (const value of stored) {
    if (!value || typeof value !== "object")
      throw new Error("Could not read song collections.")
    const item = value as Record<string, unknown>
    if (
      typeof item.id !== "string" ||
      !item.id ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      typeof item.enabled !== "boolean" ||
      !Array.isArray(item.songs) ||
      !item.songs.every(isSong)
    ) {
      throw new Error("Could not read song collections.")
    }
    collections.push({
      id: item.id,
      name: item.name,
      enabled: item.enabled,
      songs: item.songs,
    })
  }
  return collections
}

async function loadCollectionVisibility(): Promise<Record<string, boolean>> {
  const value = await readLibraryValue(COLLECTION_VISIBILITY_KEY)
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
    )
  )
}

async function setVirtualCollectionEnabled(
  id: "easyworship" | "custom",
  enabled: boolean
): Promise<void> {
  const visibility = await loadCollectionVisibility()
  await writeLibraryValue(COLLECTION_VISIBILITY_KEY, {
    ...visibility,
    [id]: enabled,
  })
}

export async function getSongCollectionSummaries(): Promise<
  SongCollectionSummary[]
> {
  const [collections, easyworship, custom, visibility] = await Promise.all([
    loadSongCollections(),
    loadEasyWorshipSongs(),
    loadCustomSongs(),
    loadCollectionVisibility(),
  ])
  const summaries: SongCollectionSummary[] = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    enabled: collection.enabled,
    count: collection.songs.length,
    kind: "collection",
  }))
  if (easyworship.length)
    summaries.push({
      id: "easyworship",
      name: "EasyWorship",
      enabled: visibility.easyworship !== false,
      count: easyworship.length,
      kind: "easyworship",
    })
  if (custom.length)
    summaries.push({
      id: "custom",
      name: MY_SONGS_LABEL,
      enabled: visibility.custom !== false,
      count: custom.length,
      kind: "custom",
    })
  return summaries
}

export async function createSongCollection(
  name: string,
  inputSongs: CopSong[] = []
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Enter a collection name.")
  const collections = await loadSongCollections()
  if (
    collections.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    )
  )
    throw new Error("A collection with this name already exists.")
  const id = crypto.randomUUID()
  const source = `collection:${id}` as const
  const songs = inputSongs.map((song, index) => ({
    ...song,
    id: `${source}:${index}:${song.id}`,
    source,
    sourceLabel: trimmed,
  }))
  await writeLibraryValue(COLLECTIONS_KEY, [
    ...collections,
    { id, name: trimmed, enabled: true, songs },
  ])
}

export async function importSongCollection(text: string): Promise<void> {
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch {
    throw new Error("This is not a valid song collection file.")
  }
  if (!value || typeof value !== "object")
    throw new Error("This is not a valid song collection file.")
  const data = value as Record<string, unknown>
  if (
    data.format !== "fellowshow-song-collection" ||
    data.version !== 1 ||
    typeof data.name !== "string" ||
    !Array.isArray(data.songs) ||
    !data.songs.every(isSong)
  ) {
    throw new Error("This is not a supported song collection file.")
  }
  await createSongCollection(data.name, data.songs)
}

export async function setSongCollectionEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  if (id === "easyworship" || id === "custom") {
    await setVirtualCollectionEnabled(id, enabled)
    return
  }
  const collections = await loadSongCollections()
  if (!collections.some((item) => item.id === id))
    throw new Error("Song collection not found.")
  await writeLibraryValue(
    COLLECTIONS_KEY,
    collections.map((item) => (item.id === id ? { ...item, enabled } : item))
  )
}

export async function removeSongCollection(id: string): Promise<void> {
  const collections = await loadSongCollections()
  const collection = collections.find((item) => item.id === id)
  if (!collection) throw new Error("Song collection not found.")
  const edits = await loadSongEdits()
  for (const song of collection.songs) delete edits[song.id]
  await writeLibraryValues({
    [COLLECTIONS_KEY]: collections.filter((item) => item.id !== id),
    [SONG_EDITS_KEY]: edits,
  })
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
  lyrics: string,
  collectionId?: string
): Promise<CopSong> {
  if (collectionId) {
    const collections = await loadSongCollections()
    const collection = collections.find((item) => item.id === collectionId)
    if (!collection || !collection.enabled)
      throw new Error("Choose an enabled song collection.")
    const song: CopSong = {
      id: `custom-${crypto.randomUUID()}`,
      language: "english",
      languageLabel: collection.name,
      number: 0,
      title: title.trim(),
      lyrics: lyrics.trim(),
      source: `collection:${collection.id}`,
      sourceLabel: collection.name,
      userCreated: true,
    }
    await writeLibraryValue(
      COLLECTIONS_KEY,
      collections.map((item) =>
        item.id === collectionId
          ? { ...item, songs: [...item.songs, song] }
          : item
      )
    )
    return song
  }
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
  await setVirtualCollectionEnabled("custom", true)
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
  const collections = await loadSongCollections()
  if (
    collections.some((item) =>
      item.songs.some((song) => song.id === songId && song.userCreated)
    )
  ) {
    await writeLibraryValue(
      COLLECTIONS_KEY,
      collections.map((item) => ({
        ...item,
        songs: item.songs.filter(
          (song) => song.id !== songId || !song.userCreated
        ),
      }))
    )
    await resetSongEdits(songId)
    return
  }
  const songs = await loadCustomSongs()
  await writeLibraryValue(
    CUSTOM_SONGS_KEY,
    songs.filter((song) => song.id !== songId)
  )
}

/**
 * Load enabled user-managed collections and operator-created songs.
 * Results are cached, and concurrent callers share one in-flight request.
 */
export async function loadAllSongs(): Promise<CopSong[]> {
  if (cache) return cache
  if (inflight) return inflight

  const startedAt = generation
  const request = Promise.all([
    loadSongCollections(),
    loadEasyWorshipSongs(),
    loadCustomSongs(),
    loadSongEdits(),
    loadCollectionVisibility(),
  ])
    .then(([collections, easyworship, custom, edits, visibility]) => {
      const songs = applySongEdits(
        [
          ...collections
            .filter((item) => item.enabled)
            .flatMap((item) => item.songs),
          ...(visibility.easyworship === false ? [] : easyworship),
          ...(visibility.custom === false ? [] : custom),
        ],
        edits
      )
      if (startedAt === generation) cache = songs
      return songs
    })
    .finally(() => {
      if (inflight === request) inflight = null
    })
  inflight = request
  return request
}
