import { useBroadcastStore } from "@/stores/broadcast-store"
import { SliderField } from "@/components/ui/slider-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function TransitionProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme) return null

  const transition = draftTheme.transition

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Animation</label>
        <Select value={transition.type} onValueChange={(v) => update("transition.type", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {transition.type !== "none" && (
        <>
          <SliderField
            label="Duration"
            value={transition.duration}
            min={100}
            max={2000}
            step={50}
            unit="ms"
            defaultValue={500}
            onChange={(v) => update("transition.duration", v)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Easing</label>
            <Select value={transition.easing} onValueChange={(v) => update("transition.easing", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ease-in-out">Ease in/out</SelectItem>
                <SelectItem value="ease-in">Ease in</SelectItem>
                <SelectItem value="ease-out">Ease out</SelectItem>
                <SelectItem value="linear">Linear</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transition.type === "slide" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Direction</label>
              <Select value={transition.direction} onValueChange={(v) => update("transition.direction", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </div>
  )
}
