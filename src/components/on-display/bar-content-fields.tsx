import { BookOpenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { getOverlayScripture } from "@/lib/overlays"
import { useBibleStore, useBroadcastStore } from "@/stores"
import type { BarSource } from "@/types"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"

const TEXTAREA_CLASS =
  "min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export interface BarContentDraft {
  source: BarSource
  heading: string
  badge: string
  text: string
  showBadge: boolean
}

/** What a bar says: typed words by default, with scripture as a helper. */
export function BarContentFields({
  value,
  onChange,
}: {
  value: BarContentDraft
  onChange: (value: BarContentDraft) => void
}) {
  const selectedVerse = useBibleStore((state) => state.selectedVerse)
  const previewVerse = useBroadcastStore((state) => state.previewVerse)
  const update = (patch: Partial<BarContentDraft>) =>
    onChange({ ...value, ...patch })

  const applyChosenVerse = () => {
    // The verse picked in the Sermon tab, else the verse staged in Preview.
    const scripture =
      (selectedVerse && selectedVerse.book_number > 0
        ? getOverlayScripture(
            toVerseRenderData(selectedVerse, activeTranslationAbbreviation())
          )
        : null) ?? getOverlayScripture(previewVerse)
    if (!scripture) return
    update({
      heading: scripture.heading,
      badge: scripture.badge ?? "",
      text: scripture.segments.map((segment) => segment.text).join(" "),
    })
  }
  const canUseVerse =
    Boolean(selectedVerse && selectedVerse.book_number > 0) ||
    previewVerse?.themeSection === "bible"

  const followsVerse = value.source === "live-verse"

  return (
    <div className="grid gap-3">
      {followsVerse ? (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          This bar shows the verse on Program, or staged in Preview, and changes
          as you move to the next verse. Turn off "Follow the verse on screen"
          below to type your own words instead.
        </p>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-1 text-xs font-medium">
            {value.source === "verse" ? "Reference" : "Heading (optional)"}
            <Input
              value={value.heading}
              maxLength={80}
              placeholder={value.source === "verse" ? "John 3:16" : "This week"}
              onChange={(event) => update({ heading: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            {value.source === "verse" ? "Verse text" : "Message"}
            <textarea
              value={value.text}
              rows={4}
              autoFocus
              placeholder="Type what you want people to see"
              className={TEXTAREA_CLASS}
              onChange={(event) => update({ text: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            {value.source === "verse" ? "Translation" : "Badge (optional)"}
            <Input
              value={value.badge}
              maxLength={24}
              placeholder={value.source === "verse" ? "KJV" : "Notice"}
              onChange={(event) => update({ badge: event.target.value })}
            />
          </label>
        </div>
      )}
      <div className="grid gap-2 rounded-md border border-border p-3">
        <span className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
          Scripture
        </span>
        {followsVerse ? null : (
          <div className="grid gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canUseVerse}
              onClick={() => {
                applyChosenVerse()
                update({ source: "verse" })
              }}
            >
              <BookOpenIcon />
              Insert the selected verse
            </Button>
            <p className="text-[0.6875rem] text-muted-foreground">
              {canUseVerse
                ? "Fills in the verse selected in the Sermon tab, or staged in Preview. You can still edit it."
                : "Select a verse in the Sermon tab to insert it here."}
            </p>
          </div>
        )}
        <label className="flex items-center justify-between gap-3 text-xs font-medium">
          <span>
            Follow the verse on screen
            <span className="block font-normal text-muted-foreground">
              The bar changes with each verse you show.
            </span>
          </span>
          <Switch
            checked={followsVerse}
            onCheckedChange={(follow) =>
              update({ source: follow ? "live-verse" : "text" })
            }
          />
        </label>
      </div>
      <label className="flex items-center justify-between gap-3 text-xs font-medium">
        {value.source === "text"
          ? "Show the badge"
          : "Show the translation badge"}
        <Switch
          checked={value.showBadge}
          onCheckedChange={(showBadge) => update({ showBadge })}
        />
      </label>
    </div>
  )
}
