import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { isFullWidthLowerThird } from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"
import type { OverlayLook } from "@/types"

const NONE = "none"

type LookDraft = Omit<OverlayLook, "id">

function GraphicSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: { id: string; name: string }[]
  onChange: (value: string | null) => void
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <Select
        value={value ?? NONE}
        onValueChange={(next) => onChange(next === NONE ? null : next)}
      >
        <SelectTrigger size="sm" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

/**
 * Creates or edits a Look. Mount it with a key per opening so the draft starts
 * from the saved Look, or from what Preview holds for a new one.
 */
export function OverlayLookDialog({
  lookId,
  open,
  onOpenChange,
}: {
  lookId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const config = useBroadcastStore((state) => state.overlayConfig)
  const [draft, setDraft] = useState<LookDraft>(() => {
    const state = useBroadcastStore.getState()
    const look = state.overlayConfig.looks.find((item) => item.id === lookId)
    if (look) return look
    const staged = state.stagedOverlays
    return {
      name: "",
      logo: staged.logoVisible,
      lowerThirdPresetId: staged.lowerThird?.preset.id ?? null,
      tickerMessageId: staged.tickerMessageId,
      barId: staged.barId,
    }
  })
  const [error, setError] = useState<string | null>(null)
  const isBanner = (presetId: string | null) =>
    isFullWidthLowerThird(
      config.lowerThirdPresets.find((preset) => preset.id === presetId)
    )

  const save = () => {
    if (!draft.name.trim()) {
      setError("Give the Look a name, like Sermon or Offering.")
      return
    }
    const store = useBroadcastStore.getState()
    const id = store.saveOverlayLook({
      ...draft,
      name: draft.name.trim(),
      id: lookId ?? undefined,
    })
    store.stageOverlayLook(id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lookId ? "Edit Look" : "Save Look"}</DialogTitle>
          <DialogDescription>
            A Look puts several graphics into Preview in one tap.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs font-medium">
            Look name
            <Input
              value={draft.name}
              maxLength={40}
              placeholder="Sermon"
              onChange={(event) => {
                setError(null)
                setDraft({ ...draft, name: event.target.value })
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-xs font-medium">
            Logo
            <Switch
              checked={draft.logo}
              disabled={config.logo.logos.length === 0}
              onCheckedChange={(logo) => setDraft({ ...draft, logo })}
            />
          </label>
          <GraphicSelect
            label="Bar"
            value={draft.barId}
            options={config.bars}
            onChange={(barId) =>
              setDraft(
                barId
                  ? {
                      ...draft,
                      barId,
                      lowerThirdPresetId: null,
                      tickerMessageId: null,
                    }
                  : { ...draft, barId }
              )
            }
          />
          <GraphicSelect
            label="Lower third"
            value={draft.lowerThirdPresetId}
            options={config.lowerThirdPresets}
            onChange={(lowerThirdPresetId) =>
              setDraft({
                ...draft,
                lowerThirdPresetId,
                barId: lowerThirdPresetId ? null : draft.barId,
                tickerMessageId: isBanner(lowerThirdPresetId)
                  ? null
                  : draft.tickerMessageId,
              })
            }
          />
          <GraphicSelect
            label="Scrolling text"
            value={draft.tickerMessageId}
            options={config.tickerMessages.map((message) => ({
              id: message.id,
              name: message.text,
            }))}
            onChange={(tickerMessageId) =>
              setDraft({
                ...draft,
                tickerMessageId,
                barId: tickerMessageId ? null : draft.barId,
                lowerThirdPresetId:
                  tickerMessageId && isBanner(draft.lowerThirdPresetId)
                    ? null
                    : draft.lowerThirdPresetId,
              })
            }
          />
          <p className="text-[0.6875rem] text-muted-foreground">
            A bar fills the bottom of the screen, so it cannot share it with a
            lower third or scrolling text. A full-width lower third cannot share
            it with scrolling text. Picking one clears the other.
          </p>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="items-center sm:justify-between">
          {lookId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                useBroadcastStore.getState().deleteOverlayLook(lookId)
                onOpenChange(false)
              }}
            >
              Delete Look
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save Look
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
