import type { NdiResolution, NdiStartRequest } from "@/types/ndi"

const NDI_MAX_DIMENSION = 3840
const NDI_MAX_PIXELS = 3840 * 2160

export function isValidNdiResolutionSize(
  width: number,
  height: number
): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 2 &&
    height >= 2 &&
    width <= NDI_MAX_DIMENSION &&
    height <= NDI_MAX_DIMENSION &&
    width % 2 === 0 &&
    height % 2 === 0 &&
    width * height <= NDI_MAX_PIXELS
  )
}

export function ndiResolutionDimensions(resolution: NdiResolution): {
  width: number
  height: number
} {
  switch (resolution) {
    case "r720p":
      return { width: 1280, height: 720 }
    case "r1080p":
      return { width: 1920, height: 1080 }
    case "r4k":
      return { width: 3840, height: 2160 }
    default:
      return resolution.custom
  }
}

export function sameNdiResolution(
  left: NdiResolution,
  right: NdiResolution
): boolean {
  if (typeof left === "string" || typeof right === "string")
    return left === right
  return (
    left.custom.width === right.custom.width &&
    left.custom.height === right.custom.height
  )
}

function sanitizeNdiResolution(value: unknown): NdiResolution | undefined {
  if (value === "r720p" || value === "r1080p" || value === "r4k") return value
  if (!value || typeof value !== "object" || !("custom" in value)) return
  const size = value.custom
  if (
    !size ||
    typeof size !== "object" ||
    !("width" in size) ||
    !("height" in size) ||
    typeof size.width !== "number" ||
    typeof size.height !== "number" ||
    !isValidNdiResolutionSize(size.width, size.height)
  ) {
    return
  }
  return { custom: { width: size.width, height: size.height } }
}

export function defaultNdiOutputConfig(name: string): NdiStartRequest {
  return {
    sourceName: `FellowShow ${name.replaceAll("\0", "")}`,
    resolution: "r1080p",
    // Most switchers and streams run at 30 or 60; 24 judders on tickers.
    frameRate: "fps30",
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
      sanitizeNdiResolution(candidate.resolution) ?? fallback.resolution,
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
    sameNdiResolution(left.resolution, right.resolution) &&
    left.frameRate === right.frameRate &&
    left.alphaMode === right.alphaMode
  )
}
