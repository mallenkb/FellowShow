import { useRef, useState, type ChangeEvent } from "react"
import { ImageIcon, Settings2Icon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { SliderField } from "@/components/ui/slider-field"
import { cachePresentationMedia } from "@/lib/presentation-media"
import { useBroadcastStore } from "@/stores"
import type { OverlayPosition } from "@/types"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlaySection } from "./overlay-section"

const POSITION_LABELS: Record<OverlayPosition, string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
}

const POSITION_VALUES: Record<
  OverlayPosition,
  { xPercent: number; yPercent: number }
> = {
  "top-left": { xPercent: 10, yPercent: 10 },
  "top-right": { xPercent: 90, yPercent: 10 },
  "bottom-left": { xPercent: 10, yPercent: 90 },
  "bottom-right": { xPercent: 90, yPercent: 90 },
}

export function LogoOverlaySection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const logo = useBroadcastStore((state) => state.overlayConfig.logo)
  const visible = useBroadcastStore((state) => state.activeOverlays.logoVisible)
  const updateLogo = useBroadcastStore((state) => state.updateLogoOverlay)
  const setVisible = useBroadcastStore((state) => state.setLogoOverlayVisible)
  const selectedPosition =
    (Object.keys(POSITION_VALUES) as OverlayPosition[]).find((position) => {
      const values = POSITION_VALUES[position]
      return (
        values.xPercent === logo.xPercent && values.yPercent === logo.yPercent
      )
    }) ?? "custom"

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      const isFirstLogo = !logo.imageUrl
      const imageUrl = await cachePresentationMedia(file, file.name)
      updateLogo({ imageUrl })
      if (isFirstLogo) setVisible(true)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load logo."
      )
    }
  }

  return (
    <OverlaySection
      title="Logo"
      description="Stays on until you switch it off."
      action={
        <Switch
          aria-label="Show logo"
          checked={visible}
          disabled={!logo.imageUrl}
          onCheckedChange={setVisible}
        />
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/svg+xml,.svg"
        className="hidden"
        onChange={(event) => void handleFile(event)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={logo.imageUrl ? "outline" : "default"}
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          {logo.imageUrl ? <ImageIcon /> : <UploadIcon />}
          {logo.imageUrl ? "Replace" : "Choose logo"}
        </Button>
        <Select
          value={selectedPosition}
          onValueChange={(value) => {
            if (value === "custom") return
            const position = value as OverlayPosition
            updateLogo({ position, ...POSITION_VALUES[position] })
          }}
        >
          <SelectTrigger size="sm" aria-label="Logo position">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectedPosition === "custom" ? (
              <SelectItem value="custom" disabled>
                Custom position
              </SelectItem>
            ) : null}
            {Object.entries(POSITION_LABELS).map(([position, label]) => (
              <SelectItem key={position} value={position}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <OutputTargetSelector
          value={logo.targetOutputIds}
          onChange={(targetOutputIds) => updateLogo({ targetOutputIds })}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Logo settings"
          title="Logo settings"
          disabled={!logo.imageUrl}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2Icon />
        </Button>
        {logo.imageUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove logo"
            title="Remove logo"
            onClick={() => {
              setVisible(false)
              updateLogo({ imageUrl: null })
            }}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
      {logo.imageUrl ? (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-muted/20 p-2.5">
          <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-black/70 p-1.5">
            <img
              src={logo.imageUrl}
              alt="Uploaded logo preview"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium">Logo preview</p>
            <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
              Use settings to adjust its size and position.
            </p>
          </div>
        </div>
      ) : null}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Logo settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-md border border-border bg-black">
              <div className="border-b border-border bg-card px-3 py-2 text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
                Preview
              </div>
              <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_70%_20%,#14536a,transparent_45%),#071116]">
                {logo.imageUrl ? (
                  <img
                    src={logo.imageUrl}
                    alt="Logo output preview"
                    className="pointer-events-none absolute max-h-[80%] object-contain"
                    style={{
                      left: `${logo.xPercent}%`,
                      top: `${logo.yPercent}%`,
                      width: `${logo.widthPercent}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ) : null}
              </div>
            </div>
            <SliderField
              label="Size"
              min={4}
              max={30}
              value={logo.widthPercent}
              unit="%"
              defaultValue={12}
              onChange={(widthPercent) => updateLogo({ widthPercent })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SliderField
                label="Horizontal position"
                min={0}
                max={100}
                value={logo.xPercent}
                unit="%"
                defaultValue={90}
                onChange={(xPercent) => updateLogo({ xPercent })}
              />
              <SliderField
                label="Vertical position"
                min={0}
                max={100}
                value={logo.yPercent}
                unit="%"
                defaultValue={10}
                onChange={(yPercent) => updateLogo({ yPercent })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OverlaySection>
  )
}
