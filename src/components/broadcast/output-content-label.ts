import {
  outputContentLabel,
  type OutputContent,
} from "@/lib/broadcast-outputs"

/** User-facing role label; storage and routing continue to use `overlays`. */
export function userFacingOutputLabel(content: OutputContent): string {
  return content === "overlays" ? "Video Overlays" : outputContentLabel(content)
}
