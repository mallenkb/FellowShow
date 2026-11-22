import { join, videoDir } from "@tauri-apps/api/path"
import {
  mkdir,
  readDir,
  readTextFile,
  rename,
  truncate,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs"

/**
 * Every sermon has one folder in Videos/FellowShow named after it, e.g.
 * "2026-11-15 Lifted Up". It holds the GoStream video (one file per
 * listening stretch, so a pause, restart or crash only starts a new file)
 * and, when the operator opens it, the audio, transcript and notes.
 * A small `.fellowshow-sermon.json` marks which sermon a folder belongs to.
 */

export type RecordingExtension = "mp4" | "webm"

export interface RecordingFormat {
  mimeType: string
  extension: RecordingExtension
}

export interface SermonFolderInfo {
  id: string
  title: string
  startedAt: number
}

const CANDIDATES: readonly RecordingFormat[] = [
  { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
]

const MARKER = ".fellowshow-sermon.json"

/** No video format this web view can record. Its message is shown as is. */
export class RecordingUnsupportedError extends Error {
  constructor() {
    super("This computer cannot record video here.")
    this.name = "RecordingUnsupportedError"
  }
}

export function pickRecordingMimeType(
  isSupported: (type: string) => boolean
): RecordingFormat {
  const found = CANDIDATES.find((candidate) => isSupported(candidate.mimeType))
  if (!found) throw new RecordingUnsupportedError()
  return { ...found }
}

const pad = (value: number) => String(value).padStart(2, "0")

// eslint-disable-next-line no-control-regex
const INVALID_FILE_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g

function cleanName(text: string): string {
  return (
    text
      .replace(INVALID_FILE_CHARS, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80)
      .trim()
      // Windows rejects names ending in a dot.
      .replace(/\.+$/, "")
      .trim() || "Sermon"
  )
}

function dateStamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-11-15 Lifted Up" */
export function sermonFolderName(sermon: SermonFolderInfo): string {
  return `${dateStamp(new Date(sermon.startedAt))} ${cleanName(sermon.title)}`
}

/** "Video 10-32-05.mp4", by the local time the part started. */
export function videoPartName(
  startedAt: number,
  extension: RecordingExtension
): string {
  const date = new Date(startedAt)
  return `Video ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(
    date.getSeconds()
  )}.${extension}`
}

// A GoStream reconnect can start another part in the same second.
export async function nextVideoPartPath(
  folder: string,
  startedAt: number,
  extension: RecordingExtension
) {
  const name = videoPartName(startedAt, extension)
  const names = new Set((await readDir(folder)).map((entry) => entry.name))
  const stem = name.slice(0, name.lastIndexOf("."))
  let candidate = name
  for (let part = 2; names.has(candidate); part++)
    candidate = `${stem} (${part}).${extension}`
  return join(folder, candidate)
}

async function recordingsRoot(): Promise<string> {
  return join(await videoDir(), "FellowShow")
}

async function markerId(folder: string): Promise<string | null> {
  try {
    const value: unknown = JSON.parse(
      await readTextFile(await join(folder, MARKER))
    )
    const id = (value as { sermonId?: unknown } | null)?.sermonId
    return typeof id === "string" ? id : null
  } catch {
    return null
  }
}

async function findSermonFolder(
  root: string,
  sermonId: string
): Promise<{ path: string; name: string } | null> {
  let entries: Awaited<ReturnType<typeof readDir>>
  try {
    entries = await readDir(root)
  } catch {
    return null
  }
  for (const entry of entries) {
    if (!entry.isDirectory) continue
    const path = await join(root, entry.name)
    if ((await markerId(path)) === sermonId) return { path, name: entry.name }
  }
  return null
}

async function freeName(root: string, base: string): Promise<string> {
  let names: Set<string>
  try {
    names = new Set((await readDir(root)).map((entry) => entry.name))
  } catch {
    names = new Set()
  }
  if (!names.has(base)) return base
  for (let index = 2; ; index++) {
    const candidate = `${base} (${index})`
    if (!names.has(candidate)) return candidate
  }
}

/**
 * The sermon's folder, made if needed. When the sermon was renamed since,
 * the folder is renamed to match.
 */
export async function prepareSermonFolder(
  sermon: SermonFolderInfo,
  { allowRename = true }: { allowRename?: boolean } = {}
): Promise<string> {
  const root = await recordingsRoot()
  await mkdir(root, { recursive: true })
  const wanted = sermonFolderName(sermon)
  const existing = await findSermonFolder(root, sermon.id)
  if (existing) {
    if (
      !allowRename ||
      existing.name === wanted ||
      existing.name.startsWith(`${wanted} (`)
    )
      return existing.path
    const target = await join(root, await freeName(root, wanted))
    try {
      await rename(existing.path, target)
      return target
    } catch (error) {
      console.warn("[recording] Could not rename the sermon folder", error)
      return existing.path
    }
  }
  const folder = await join(root, await freeName(root, wanted))
  await mkdir(folder, { recursive: true })
  await writeTextFile(
    await join(folder, MARKER),
    JSON.stringify({ version: 1, sermonId: sermon.id })
  )
  return folder
}

export interface ChunkWriter {
  write: (blob: Blob) => Promise<void>
  flush: () => Promise<void>
  retry: () => Promise<void>
}

/** Appends chunks to one file in order. A failed write rejects flush(). */
export function createChunkWriter(path: string): ChunkWriter {
  let chain: Promise<void> = Promise.resolve()
  let savedBytes = 0
  let failure: Error | null = null
  const unsaved: Blob[] = []

  async function append(blob: Blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (savedBytes === 0) await writeFile(path, bytes)
    else await writeFile(path, bytes, { append: true })
    savedBytes += bytes.byteLength
  }

  return {
    write(blob) {
      const next = chain.then(async () => {
        try {
          if (failure) throw failure
          await append(blob)
        } catch (error) {
          unsaved.push(blob)
          failure = error instanceof Error ? error : new Error(String(error))
          throw failure
        }
      })
      chain = next.catch(() => {})
      return next
    },
    async flush() {
      await chain
      if (failure) throw failure
    },
    // Called only after the recorder stopped and flush reported an error.
    async retry() {
      // An append may have written a partial chunk before the disk filled.
      if (savedBytes > 0) await truncate(path, savedBytes)
      while (unsaved.length) {
        await append(unsaved[0])
        unsaved.shift()
      }
      failure = null
    },
  }
}

/** "mm:ss" under an hour, else "h:mm:ss". */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}
