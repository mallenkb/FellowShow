import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OutputRuntime } from "@/lib/broadcast-output-runtime"
import {
  isValidNdiResolutionSize,
  ndiResolutionDimensions,
} from "@/lib/ndi-output-config"
import type { NdiAlphaMode, NdiFrameRate } from "@/types/ndi"

const NDI_RESOLUTION_OPTIONS = [
  { value: "r1080p", label: "1080p (1920×1080)" },
  { value: "r720p", label: "720p (1280×720)" },
  { value: "r4k", label: "4K (3840×2160)" },
]

const NDI_FRAME_RATE_OPTIONS: Array<{ value: NdiFrameRate; label: string }> = [
  { value: "fps24", label: "24 fps" },
  { value: "fps30", label: "30 fps" },
  { value: "fps60", label: "60 fps" },
]

const NDI_ALPHA_OPTIONS: Array<{ value: NdiAlphaMode; label: string }> = [
  { value: "noneOpaque", label: "Off (opaque)" },
  { value: "straightAlpha", label: "Transparent (straight)" },
  { value: "premultipliedAlpha", label: "Transparent (premultiplied)" },
]

type NdiSettings = Pick<
  OutputRuntime,
  "ndiResolution" | "ndiFrameRate" | "ndiAlphaMode"
>

export function NdiOutputSettings({
  settings,
  disabled,
  carriesGraphics = false,
  onChange,
}: {
  settings: NdiSettings
  disabled: boolean
  /** Graphics outputs explain what transparency does for keying. */
  carriesGraphics?: boolean
  onChange: (updates: Partial<NdiSettings>) => void
}) {
  const { ndiResolution, ndiFrameRate, ndiAlphaMode } = settings
  const [widthDraft, setWidthDraft] = useState<string>()
  const [heightDraft, setHeightDraft] = useState<string>()
  const sizeHintId = useId()
  const alphaHintId = useId()
  const size = ndiResolutionDimensions(ndiResolution)
  const width = Number(widthDraft ?? size.width)
  const height = Number(heightDraft ?? size.height)
  const validSize = isValidNdiResolutionSize(width, height)
  const isCustom = typeof ndiResolution !== "string"

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Resolution</label>
          <Select
            value={typeof ndiResolution === "string" ? ndiResolution : "custom"}
            disabled={disabled}
            onValueChange={(value) => {
              setWidthDraft(undefined)
              setHeightDraft(undefined)
              switch (value) {
                case "r720p":
                case "r1080p":
                case "r4k":
                  onChange({ ndiResolution: value })
                  break
                case "custom":
                  onChange({ ndiResolution: { custom: size } })
                  break
              }
            }}
          >
            <SelectTrigger className="w-full" aria-label="NDI resolution">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NDI_RESOLUTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Frame Rate</label>
          <Select
            value={ndiFrameRate}
            disabled={disabled}
            onValueChange={(value) =>
              onChange({ ndiFrameRate: value as NdiFrameRate })
            }
          >
            <SelectTrigger className="w-full" aria-label="NDI frame rate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NDI_FRAME_RATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isCustom && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs text-muted-foreground">
              <span>Width (px)</span>
              <Input
                type="number"
                value={widthDraft ?? size.width}
                onChange={(event) => setWidthDraft(event.target.value)}
                disabled={disabled}
                aria-describedby={sizeHintId}
              />
            </label>
            <label className="block space-y-1.5 text-xs text-muted-foreground">
              <span>Height (px)</span>
              <Input
                type="number"
                value={heightDraft ?? size.height}
                onChange={(event) => setHeightDraft(event.target.value)}
                disabled={disabled}
                aria-describedby={sizeHintId}
              />
            </label>
          </div>
          <p id={sizeHintId} className="text-xs text-muted-foreground">
            Use even values from 2 to 3840 with a total pixel count no higher
            than 4K.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              disabled ||
              !validSize ||
              (width === size.width && height === size.height)
            }
            onClick={() => {
              onChange({ ndiResolution: { custom: { width, height } } })
              setWidthDraft(undefined)
              setHeightDraft(undefined)
            }}
          >
            Apply size
          </Button>
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Alpha Channel</label>
        <Select
          value={ndiAlphaMode}
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ ndiAlphaMode: value as NdiAlphaMode })
          }
        >
          <SelectTrigger
            className="w-full"
            aria-label="NDI alpha channel"
            aria-describedby={alphaHintId}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NDI_ALPHA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id={alphaHintId} className="text-xs text-muted-foreground">
          {carriesGraphics
            ? "Transparent sends graphics on a see-through background, so vMix or OBS can layer them without a key. Off sends them on the DSK black or CMK green key color."
            : "Slides and scripture fill the frame, so Off and Transparent look the same here."}
        </p>
      </div>
    </>
  )
}
