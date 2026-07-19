import { convertFileSrc, isTauri } from "@tauri-apps/api/core"
import { appDataDir, join } from "@tauri-apps/api/path"
import { mkdir, writeFile } from "@tauri-apps/plugin-fs"

export interface CachedPresentationMedia {
  url: string
  filePath: string | null
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
    blob.type
  )
}

export async function cachePresentationMedia(
  blob: Blob,
  originalName: string
): Promise<string> {
  const asset = await cachePresentationMediaAsset(blob, originalName)
  return asset.url
}
