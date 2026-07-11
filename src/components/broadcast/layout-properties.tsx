import { useBroadcastStore } from "@/stores/broadcast-store"
import { SliderField } from "@/components/ui/slider-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BroadcastTheme } from "@/types"

export function LayoutProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftDeep)

  if (!draftTheme) return null

  const layout = draftTheme.layout
  const resolution = draftTheme.resolution
  const referenceGap =
    layout.referenceGap ??
    Math.max(16, Math.round(draftTheme.reference.fontSize * 0.5))

  const verseNumbers = draftTheme.verseNumbers
  const superscriptSizePct = Math.round(
    (verseNumbers.fontSize / draftTheme.verseText.fontSize) * 100
  )

  const pctWithPx = (value: number, total: number) =>
    `${value}% (${Math.round((value / 100) * total)}px)`

  return (
    <div className="flex flex-col gap-3">
      {/* Background Dimensions */}
      <div className="flex flex-col gap-0.5 pb-1">
        <h4 className="text-xs font-semibold">Background Dimensions</h4>
      </div>

      <SliderField
        label="Width"
        value={layout.backgroundWidth}
        min={10}
        max={100}
        format={(v) => pctWithPx(v, resolution.width)}
        onChange={(v) =>
          update((draft) => {
            draft.layout.backgroundWidth = v
          }, "layout.backgroundWidth")
        }
      />
      <SliderField
        label="Height"
        value={layout.backgroundHeight}
        min={10}
        max={100}
        format={(v) => pctWithPx(v, resolution.height)}
        onChange={(v) =>
          update((draft) => {
            draft.layout.backgroundHeight = v
          }, "layout.backgroundHeight")
        }
      />

      {/* Text Area Dimensions */}
      <div className="flex flex-col gap-0.5 border-t pt-3 pb-1">
        <h4 className="text-xs font-semibold">Text Area Dimensions</h4>
      </div>

      <SliderField
        label="Text Width"
        value={layout.textAreaWidth}
        min={10}
        max={100}
        format={(v) => pctWithPx(v, resolution.width)}
        onChange={(v) =>
          update((draft) => {
            draft.layout.textAreaWidth = v
          }, "layout.textAreaWidth")
        }
      />
      <SliderField
        label="Text Height"
        value={layout.textAreaHeight}
        min={10}
        max={100}
        format={(v) => pctWithPx(v, resolution.height)}
        onChange={(v) =>
          update((draft) => {
            draft.layout.textAreaHeight = v
          }, "layout.textAreaHeight")
        }
      />

      {/* Padding */}
      <div className="flex flex-col gap-0.5 border-t pt-3 pb-1">
        <h4 className="text-xs font-semibold">Padding</h4>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Top
          </label>
          <Input
            type="number"
            min={0}
            value={layout.padding.top}
            onChange={(e) =>
              update((draft) => {
                draft.layout.padding.top = Number(e.target.value)
              }, "layout.padding.top")
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Right
          </label>
          <Input
            type="number"
            min={0}
            value={layout.padding.right}
            onChange={(e) =>
              update((draft) => {
                draft.layout.padding.right = Number(e.target.value)
              }, "layout.padding.right")
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Bottom
          </label>
          <Input
            type="number"
            min={0}
            value={layout.padding.bottom}
            onChange={(e) =>
              update((draft) => {
                draft.layout.padding.bottom = Number(e.target.value)
              }, "layout.padding.bottom")
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Left
          </label>
          <Input
            type="number"
            min={0}
            value={layout.padding.left}
            onChange={(e) =>
              update((draft) => {
                draft.layout.padding.left = Number(e.target.value)
              }, "layout.padding.left")
            }
          />
        </div>
      </div>

      {/* Element Spacing */}
      <div className="flex flex-col gap-0.5 border-t pt-3 pb-1">
        <h4 className="text-xs font-semibold">Element Spacing</h4>
      </div>

      <SliderField
        label="Verse / Reference"
        value={referenceGap}
        min={0}
        max={200}
        unit="px"
        onChange={(v) =>
          update((draft) => {
            draft.layout.referenceGap = v
          }, "layout.referenceGap")
        }
      />

      {/* Display Options */}
      <div className="flex flex-col gap-0.5 border-t pt-3 pb-1">
        <h4 className="text-xs font-semibold">Display Options</h4>
      </div>

      {/* Reference Position */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Reference Position
        </label>
        <Select
          value={draftTheme.reference.position}
          onValueChange={(v) =>
            update((draft) => {
              draft.reference.position =
                v as BroadcastTheme["reference"]["position"]
            }, "reference.position")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="above">Above Verse</SelectItem>
            <SelectItem value="below">Below Verse</SelectItem>
            <SelectItem value="inline">Inline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Verse Number Superscript */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Verse Number Superscript
        </label>
        <input
          type="checkbox"
          checked={verseNumbers.superscript}
          onChange={(e) =>
            update((draft) => {
              draft.verseNumbers.superscript = e.target.checked
            }, "verseNumbers.superscript")
          }
          className="h-4 w-4 rounded border-input accent-primary"
        />
      </div>

      {/* Superscript Size */}
      {verseNumbers.superscript && (
        <SliderField
          label="Superscript Size"
          value={superscriptSizePct}
          min={20}
          max={100}
          unit="%"
          onChange={(v) => {
            const newFontSize = Math.round(
              (v / 100) * draftTheme.verseText.fontSize
            )
            update((draft) => {
              draft.verseNumbers.fontSize = newFontSize
            }, "verseNumbers.fontSize")
          }}
        />
      )}
    </div>
  )
}
