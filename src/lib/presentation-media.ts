import { convertFileSrc, isTauri } from "@tauri-apps/api/core"
import { appDataDir, join } from "@tauri-apps/api/path"
import { copyFile, mkdir, remove, writeFile } from "@tauri-apps/plugin-fs"
import { validatePresentationMedia } from "@/lib/media-validation"

export interface CachedPresentationMedia {
  url: string
  filePath: string | null
}

export async function cachePresentationMediaPath(
  sourcePath: string,
  mediaType?: "image" | "video"
): Promise<string> {
  const directory = await join(await appDataDir(), "media")
  await mkdir(directory, { recursive: true })
  const extension = sourcePath.split(".").pop()?.toLowerCase() ?? "bin"
  const destination = await join(
    directory,
    `${crypto.randomUUID()}.${extension}`
  )
  await copyFile(sourcePath, destination)
  const cached = { url: convertFileSrc(destination), filePath: destination }
  await validateCachedMedia(cached, mediaType)
  return cached.url
}

async function validateCachedMedia(
  cached: CachedPresentationMedia,
  mediaType?: "image" | "video"
) {
  if (!mediaType) return
  try {
    await validatePresentationMedia(cached.url, mediaType)
  } catch (error) {
    if (cached.filePath) {
      try {
        await remove(cached.filePath)
      } catch (cleanupError) {
        console.warn(
          "[presentations] Failed to remove invalid media",
          cleanupError
        )
      }
    }
    throw error
  }
}

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

function mediaMimeType(blob: Blob, originalName: string): string {
  if (blob.type) return blob.type
  const extension = originalName.split(".").pop()?.toLowerCase() ?? ""
  return MEDIA_MIME_BY_EXTENSION[extension] ?? "application/octet-stream"
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${mimeType};base64,${btoa(binary)}`
}

export async function cacheMediaBytes(
  bytes: Uint8Array,
  originalName: string,
  mimeType: string
): Promise<CachedPresentationMedia> {
  if (!isTauri()) {
    return {
      url: bytesToDataUrl(bytes, mimeType || "application/octet-stream"),
      filePath: null,
    }
  }

  const mediaDirectory = await join(await appDataDir(), "media")
  await mkdir(mediaDirectory, { recursive: true })

  const extension = originalName.split(".").pop()?.toLowerCase()
  const fileName = `${crypto.randomUUID()}${extension ? `.${extension}` : ""}`
  const filePath = await join(mediaDirectory, fileName)
  await writeFile(filePath, bytes)
  return { url: convertFileSrc(filePath), filePath }
}

export async function cachePresentationMediaAsset(
  blob: Blob,
  originalName: string
): Promise<CachedPresentationMedia> {
  return cacheMediaBytes(
    new Uint8Array(await blob.arrayBuffer()),
    originalName,
    mediaMimeType(blob, originalName)
  )
}

export async function cachePresentationMedia(
  blob: Blob,
  originalName: string,
  mediaType?: "image" | "video"
): Promise<string> {
  const asset = await cachePresentationMediaAsset(blob, originalName)
  await validateCachedMedia(asset, mediaType)
  return asset.url
}
