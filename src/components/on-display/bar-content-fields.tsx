import { BookOpenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { getOverlayScripture } from "@/lib/overlays"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"
import { useBibleStore, useBroadcastStore } from "@/stores"
import type { BarSource } from "@/types"

const TEXTAREA_CLASS =
  "min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export interface BarContentDraft {
  source: BarSource
  heading: string
  badge: string
  text: string
  showBadge: boolean
}

/** What a bar says: typed words, with scripture one tap away. */
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
  const followsVerse = value.source === "live-verse"

  const insertVerse = () => {
    // The verse picked in the Sermon tab, else the verse staged in Preview.
    const scripture =
      (selectedVerse && selectedVerse.book_number > 0
        ? getOverlayScripture(
            toVerseRenderData(selectedVerse, activeTranslationAbbreviation())
          )
        : null) ?? getOverlayScripture(previewVerse)
    if (!scripture) return
    update({
      source: "verse",
      heading: scripture.heading,
      badge: scripture.badge ?? "",
      showBadge: Boolean(scripture.badge),
      text: scripture.segments.map((segment) => segment.text).join(" "),
    })
  }
  const canInsert =
    Boolean(selectedVerse && selectedVerse.book_number > 0) ||
    previewVerse?.themeSection === "bible"

  return (
    <div className="grid gap-3">
      {followsVerse ? (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Shows the verse on screen.
        </p>
      ) : (
        <>
          <label className="grid gap-1 text-xs font-medium">
            Heading
            <Input
              value={value.heading}
              maxLength={80}
              placeholder="This week, or John 3:16"
              onChange={(event) => update({ heading: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Message
            <textarea
              value={value.text}
              rows={4}
              autoFocus
              placeholder="Type what people should see"
              className={TEXTAREA_CLASS}
              onChange={(event) => update({ text: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Badge
            <Input
              value={value.badge}
              maxLength={24}
              placeholder="KJV or Notice (optional)"
              onChange={(event) =>
                update({
                  badge: event.target.value,
                  showBadge: event.target.value.trim().length > 0,
                })
              }
            />
          </label>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
        {followsVerse ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canInsert}
            title={
              canInsert
                ? "Fill in the verse selected in the Sermon tab"
                : "Select a verse in the Sermon tab first"
            }
            onClick={insertVerse}
          >
            <BookOpenIcon />
            Insert verse
          </Button>
        )}
        <label className="ml-auto flex items-center gap-2 text-xs font-medium">
          Follow the verse on screen
          <Switch
            checked={followsVerse}
            onCheckedChange={(follow) =>
              update({ source: follow ? "live-verse" : "text" })
            }
          />
        </label>
      </div>
    </div>
  )
}
