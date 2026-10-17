import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { ImagePlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import type { LogoOverlayItem, OverlayPosition } from "@/types"
import { OutputTargetSelector } from "./output-target-selector"

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

function selectedPositionFor(
  logo: LogoOverlayItem
): OverlayPosition | "custom" {
  return (
    (Object.keys(POSITION_VALUES) as OverlayPosition[]).find((position) => {
      const values = POSITION_VALUES[position]
      return (
        values.xPercent === logo.xPercent && values.yPercent === logo.yPercent
      )
    }) ?? "custom"
  )
}

/** Adds, removes and places logos. Changes save as you make them. */
export function LogoOverlaySection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settingsLogoId, setSettingsLogoId] = useState<string | null>(
    () => useBroadcastStore.getState().overlayConfig.logo.logos[0]?.id ?? null
  )
  const logos = useBroadcastStore((state) => state.overlayConfig.logo.logos)
  const addLogos = useBroadcastStore((state) => state.addLogoOverlays)
  const updateLogo = useBroadcastStore((state) => state.updateLogoOverlay)
  const removeLogo = useBroadcastStore((state) => state.removeLogoOverlay)
  const toggleStagedLogos = useBroadcastStore(
    (state) => state.toggleStagedLogos
  )
  const setVisible = (next: boolean) => {
    if (useBroadcastStore.getState().stagedOverlays.logoVisible !== next) {
      toggleStagedLogos()
    }
  }
  const settingsLogo = useMemo(
    () => logos.find((logo) => logo.id === settingsLogoId) ?? logos[0] ?? null,
    [logos, settingsLogoId]
  )

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    try {
      const added = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, "") || "Logo",
          imageUrl: await cachePresentationMedia(file, file.name),
          visible: true,
          position: "top-right" as const,
          xPercent: 90,
          yPercent: 10,
          widthPercent: 12,
          targetOutputIds: useBroadcastStore
            .getState()
            .outputs.map((output) => output.id),
        }))
      )
      addLogos(added)
      setSettingsLogoId(added[0]?.id ?? null)
      setVisible(true)
      toast.success(
        `${added.length} ${added.length === 1 ? "logo" : "logos"} added`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load logos."
      )
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/webp,image/svg+xml,.svg"
        className="hidden"
        aria-label="Logo images"
        onChange={(event) => void handleFiles(event)}
      />
      <div className="grid gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlusIcon />
            Add logos
          </Button>

          {logos.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  data-selected={logo.id === settingsLogo?.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-2.5 data-[selected=true]:border-primary/50"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Edit ${logo.name}`}
                    aria-pressed={logo.id === settingsLogo?.id}
                    onClick={() => setSettingsLogoId(logo.id)}
                  >
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-black/70 p-1.5">
                      <img
                        src={logo.imageUrl}
                        alt={`${logo.name} preview`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {logo.name}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                        {logo.visible
                          ? (POSITION_LABELS[
                              selectedPositionFor(logo) as OverlayPosition
                            ] ?? "Custom position")
                          : "Hidden"}
                      </p>
                    </div>
                  </button>
                  <Switch
                    aria-label={`Show ${logo.name}`}
                    checked={logo.visible}
                    onCheckedChange={(value) =>
                      updateLogo(logo.id, { visible: value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${logo.name}`}
                    title="Remove logo"
                    onClick={() => removeLogo(logo.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {settingsLogo ? (
          <section
            className="grid min-w-0 content-start gap-4"
            aria-label={`${settingsLogo.name} settings`}
          >
            <h4 className="text-sm font-semibold">{settingsLogo.name}</h4>
            <div className="overflow-hidden rounded-md border border-border bg-black">
              <div className="border-b border-border bg-card px-3 py-2 text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
                Preview
              </div>
              <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_70%_20%,#14536a,transparent_45%),#071116]">
                <img
                  src={settingsLogo.imageUrl}
                  alt="Logo output preview"
                  className="pointer-events-none absolute max-h-[80%] object-contain"
                  style={{
                    left: `${settingsLogo.xPercent}%`,
                    top: `${settingsLogo.yPercent}%`,
                    width: `${settingsLogo.widthPercent}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedPositionFor(settingsLogo)}
                onValueChange={(value) => {
                  if (value === "custom") return
                  const position = value as OverlayPosition
                  updateLogo(settingsLogo.id, {
                    position,
                    ...POSITION_VALUES[position],
                  })
                }}
              >
                <SelectTrigger size="sm" aria-label="Logo position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedPositionFor(settingsLogo) === "custom" ? (
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
                value={settingsLogo.targetOutputIds}
                onChange={(targetOutputIds) =>
                  updateLogo(settingsLogo.id, { targetOutputIds })
                }
              />
            </div>
            <SliderField
              label="Size"
              min={4}
              max={30}
              value={settingsLogo.widthPercent}
              unit="%"
              defaultValue={12}
              onChange={(widthPercent) =>
                updateLogo(settingsLogo.id, { widthPercent })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SliderField
                label="Horizontal position"
                min={0}
                max={100}
                value={settingsLogo.xPercent}
                unit="%"
                defaultValue={90}
                onChange={(xPercent) =>
                  updateLogo(settingsLogo.id, { xPercent })
                }
              />
              <SliderField
                label="Vertical position"
                min={0}
                max={100}
                value={settingsLogo.yPercent}
                unit="%"
                defaultValue={10}
                onChange={(yPercent) =>
                  updateLogo(settingsLogo.id, { yPercent })
                }
              />
            </div>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a logo to set its size and position.
          </p>
        )}
      </div>
    </div>
  )
}
