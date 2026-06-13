import { open, save } from "@tauri-apps/plugin-dialog"
import { readFile, writeTextFile } from "@tauri-apps/plugin-fs"
import type { BroadcastTheme } from "@/types"

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return `data:${mime};base64,${btoa(binary)}`
}

/**
 * Opens a native file dialog to pick a background image or video, reads it,
 * and returns a base64 data URL that persists across restarts.
 */
export async function pickThemeBackgroundMedia(): Promise<{
  url: string
  mediaType: "image" | "video"
} | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "Images and Videos",
        extensions: [
          "png",
          "jpg",
          "jpeg",
          "webp",
          "gif",
          "bmp",
          "svg",
          "mp4",
          "webm",
          "mov",
          "m4v",
        ],
      },
      {
        name: "Videos",
        extensions: ["mp4", "webm", "mov", "m4v"],
      },
    ],
  })
  if (!selected) return null

  const path = typeof selected === "string" ? selected : selected
  const bytes = await readFile(path)
  const extension = path.split(".").pop()?.toLowerCase() ?? "png"
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
  }
  const mime = mimeMap[extension] ?? "image/png"
  const mediaType = mime.startsWith("video/") ? "video" : "image"

  return { url: bytesToDataUrl(bytes, mime), mediaType }
}

/**
 * Opens a native file dialog to pick a timer background image or video and
 * returns a base64 data URL that persists in app state.
 */
export async function pickTimerBackgroundMedia(): Promise<{
  url: string
  name: string
  mediaType: "image" | "video"
} | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "Images and Videos",
        extensions: [
          "png",
          "jpg",
          "jpeg",
          "webp",
          "gif",
          "bmp",
          "svg",
          "mp4",
          "webm",
          "mov",
          "m4v",
        ],
      },
      {
        name: "Videos",
        extensions: ["mp4", "webm", "mov", "m4v"],
      },
    ],
  })
  if (!selected) return null

  const path = typeof selected === "string" ? selected : selected
  const bytes = await readFile(path)
  const extension = path.split(".").pop()?.toLowerCase() ?? "png"
  const name =
    path
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? "Uploaded background"
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
  }
  const mime = mimeMap[extension] ?? "image/png"
  const mediaType = mime.startsWith("video/") ? "video" : "image"

  return { url: bytesToDataUrl(bytes, mime), name, mediaType }
}

/**
 * Exports a theme as JSON via native save dialog.
 */
export async function exportTheme(theme: BroadcastTheme): Promise<void> {
  const path = await save({
    defaultPath: `${theme.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  })
  if (!path) return

  const json = JSON.stringify(theme, null, 2)
  await writeTextFile(path, json)
}

/**
 * Imports a theme from a JSON file via native open dialog.
 * Returns the parsed theme or null if cancelled/invalid.
 */
export async function importTheme(): Promise<BroadcastTheme | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Theme JSON", extensions: ["json"] }],
  })
  if (!selected) return null

  const path = typeof selected === "string" ? selected : selected
  const bytes = await readFile(path)
  const text = new TextDecoder().decode(bytes)
  const parsed = JSON.parse(text) as BroadcastTheme

  if (!parsed.id || !parsed.name || !parsed.background || !parsed.layout) {
    throw new Error("Invalid theme file: missing required fields")
  }

  return {
    ...parsed,
    id: crypto.randomUUID(),
    builtin: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
