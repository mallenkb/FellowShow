import { ndiResolutionDimensions } from "@/lib/ndi-output-config"
import type { NdiResolution } from "@/types/ndi"

/**
 * Simulates the NDI input check on OSEE GoStream switchers (seen on firmware
 * 2.2.0). The switcher only decodes NDI HX (H.264/H.265) at exactly
 * 1920×1080 and rejects anything else with the message below.
 */
export const GOSTREAM_REJECTION_MESSAGE =
  "An NDI signal is detected, but it is not supported. Please make sure your signal is NDI HX and the resolution is 1920*1080."

type NdiEncoding = "full-bandwidth" | "hx"

export interface NdiSignal {
  encoding: NdiEncoding
  width: number
  height: number
}

type GoStreamProblem = "not-hx" | "wrong-resolution"

export interface GoStreamCheckResult {
  supported: boolean
  problems: GoStreamProblem[]
  /** What the GoStream shows on its multiview, or null when it accepts the signal. */
  deviceMessage: string | null
}

export function checkGoStreamNdiSignal(signal: NdiSignal): GoStreamCheckResult {
  const problems: GoStreamProblem[] = []
  if (signal.encoding !== "hx") problems.push("not-hx")
  if (signal.width !== 1920 || signal.height !== 1080) {
    problems.push("wrong-resolution")
  }
  return {
    supported: problems.length === 0,
    problems,
    deviceMessage: problems.length ? GOSTREAM_REJECTION_MESSAGE : null,
  }
}

/**
 * The signal FellowShow sends. It uses the standard NDI SDK, which only sends
 * full-bandwidth NDI. NDI HX needs NDI's Advanced SDK and a video encoder.
 */
export function fellowShowNdiSignal(resolution: NdiResolution): NdiSignal {
  return { encoding: "full-bandwidth", ...ndiResolutionDimensions(resolution) }
}
