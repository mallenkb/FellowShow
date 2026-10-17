import type { NdiStartRequest } from "@/types/ndi"

export function defaultNdiOutputConfig(name: string): NdiStartRequest {
  return {
    sourceName: `FellowShow ${name.replaceAll("\0", "")}`,
    resolution: "r1080p",
    frameRate: "fps24",
    alphaMode: "straightAlpha",
  }
}

/** Restore only durable NDI choices. Connection and window state are never loaded. */
export function sanitizeNdiOutputConfig(
  value: unknown,
  fallback: NdiStartRequest
): NdiStartRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  return {
    sourceName:
      typeof candidate.sourceName === "string" &&
      candidate.sourceName.trim().length > 0 &&
      !candidate.sourceName.includes("\0")
        ? candidate.sourceName
        : fallback.sourceName,
    resolution:
      candidate.resolution === "r720p" ||
      candidate.resolution === "r1080p" ||
      candidate.resolution === "r4k"
        ? candidate.resolution
        : fallback.resolution,
    frameRate:
      candidate.frameRate === "fps24" ||
      candidate.frameRate === "fps30" ||
      candidate.frameRate === "fps60"
        ? candidate.frameRate
        : fallback.frameRate,
    alphaMode:
      candidate.alphaMode === "noneOpaque" ||
      candidate.alphaMode === "straightAlpha" ||
      candidate.alphaMode === "premultipliedAlpha"
        ? candidate.alphaMode
        : fallback.alphaMode,
  }
}

export function sameNdiOutputConfig(
  left: NdiStartRequest,
  right: NdiStartRequest
): boolean {
  return (
    left.sourceName === right.sourceName &&
    left.resolution === right.resolution &&
    left.frameRate === right.frameRate &&
    left.alphaMode === right.alphaMode
  )
}
