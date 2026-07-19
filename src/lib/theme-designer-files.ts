import { open, save } from "@tauri-apps/plugin-dialog"
import { readFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { cacheMediaBytes } from "@/lib/presentation-media"
import type { BroadcastTheme } from "@/types"

const MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
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

const THEME_MEDIA_EXTENSIONS = [
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
]

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
  const fileName = path.split(/[\\/]/).pop() ?? `background.${extension}`
  const mime = MEDIA_MIME_BY_EXTENSION[extension] ?? "image/png"
  const mediaType = mime.startsWith("video/") ? "video" : "image"
  const url =
    mediaType === "video"
      ? (await cacheMediaBytes(bytes, fileName, mime)).url
      : bytesToDataUrl(bytes, mime)

  return { url, mediaType }
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
  const mime = MEDIA_MIME_BY_EXTENSION[extension] ?? "image/png"
  const mediaType = mime.startsWith("video/") ? "video" : "image"
  const url =
    mediaType === "video"
      ? (await cacheMediaBytes(bytes, path.split(/[\\/]/).pop() ?? name, mime))
          .url
      : bytesToDataUrl(bytes, mime)

  return { url, name, mediaType }
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
 * Imports a theme JSON file or turns an image/video into a new theme using
 * the currently selected theme as its style template. Keeping the media in a
 * data URL means an uploaded background is still available after restart and
 * does not depend on the original file path.
 */
export async function importTheme(
  baseTheme?: BroadcastTheme
): Promise<BroadcastTheme | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "Themes, images, and videos",
        extensions: ["json", ...THEME_MEDIA_EXTENSIONS],
      },
      { name: "Theme JSON", extensions: ["json"] },
      { name: "Videos", extensions: ["mp4", "webm", "mov", "m4v"] },
    ],
  })
  if (!selected) return null

  if (typeof selected !== "string") {
    throw new Error("Please choose one theme file")
  }

  const path = selected
  const extension = path.split(".").pop()?.toLowerCase() ?? ""
  const bytes = await readFile(path)
  if (extension === "json") {
    const text = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(text) as BroadcastTheme

    if (!parsed.id || !parsed.name || !parsed.background || !parsed.layout) {
      throw new Error("Invalid theme file: missing required fields")
    }

    const image = parsed.background.image
    const inferredMediaType = image
      ? (image.mediaType ??
        (image.url.startsWith("data:video/") ||
        /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(image.url)
          ? "video"
          : "image"))
      : undefined

    return {
      ...parsed,
      background: image
        ? {
            ...parsed.background,
            image: { ...image, mediaType: inferredMediaType },
          }
        : parsed.background,
      id: crypto.randomUUID(),
      builtin: false,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  if (!THEME_MEDIA_EXTENSIONS.includes(extension)) {
    throw new Error("Choose a theme JSON, image, or video file")
  }
  if (!baseTheme) {
    throw new Error("Select a theme before uploading a background")
  }

  const mime = MEDIA_MIME_BY_EXTENSION[extension] ?? "application/octet-stream"
  const mediaType = mime.startsWith("video/") ? "video" : "image"
  const name =
    path
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.[^.]+$/, "")
      .trim() || "Uploaded theme"
  const now = Date.now()
  const importedTheme = structuredClone(baseTheme)
  const url =
    mediaType === "video"
      ? (await cacheMediaBytes(bytes, path.split(/[\\/]/).pop() ?? name, mime))
          .url
      : bytesToDataUrl(bytes, mime)

  return {
    ...importedTheme,
    id: crypto.randomUUID(),
    name,
    builtin: false,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    background: {
      ...importedTheme.background,
      type: "image",
      image: {
        url,
        mediaType,
        fit: "cover",
        blur: 0,
        brightness: 100,
        tint: null,
      },
    },
  }
}
