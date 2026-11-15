import { switchOutputToDisplay } from "@/lib/broadcast-output-runtime"
import {
  checkGoStreamNdiSignal,
  fellowShowNdiSignal,
} from "@/lib/gostream-ndi-check"
import type { NdiResolution } from "@/types/ndi"

/**
 * A quiet hint for churches with a GoStream switcher, which only accepts
 * NDI HX at 1920×1080 and shows "NDI signal detected, but not supported" for
 * FellowShow's full-bandwidth NDI.
 */
export function GoStreamNdiNotice({
  outputId,
  resolution,
  disabled,
}: {
  outputId: string
  resolution: NdiResolution
  disabled: boolean
}) {
  if (checkGoStreamNdiSignal(fellowShowNdiSignal(resolution)).supported) {
    return null
  }

  return (
    <p className="text-xs text-muted-foreground">
      Using a GoStream? It only accepts NDI HX, so connect it over HDMI.{" "}
      {disabled ? (
        "Turn this output off to switch it to a display."
      ) : (
        <button
          type="button"
          className="rounded-sm font-medium text-foreground underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => switchOutputToDisplay(outputId)}
        >
          Use a display instead
        </button>
      )}
    </p>
  )
}
