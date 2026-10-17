import type { ReactNode } from "react"
import { LayersIcon, PanelBottomIcon, TextIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Verse } from "@/types"
import {
  sendToBar,
  sendToScroll,
  verseContent,
  type OverlayContent,
} from "./overlay-content"

type ContentSource = () =>
  OverlayContent | null | Promise<OverlayContent | null>

function run(
  getContent: ContentSource,
  send: (content: OverlayContent) => void
): void {
  void Promise.resolve(getContent())
    .then((content) => {
      if (content) send(content)
    })
    .catch((error: unknown) => {
      console.error("[overlays] Could not load the text to send", error)
      toast.error("Could not load that text")
    })
}

/** A small button next to Add to queue that sends the item to a bar or scrolling text. */
export function SendToOverlayButton({
  label,
  getContent,
  className,
}: {
  /** Names the item for screen readers, such as "John 3:16". */
  label: string
  getContent: ContentSource
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          title="Send to bar or scrolling text"
          aria-label={`Send ${label} to a bar or scrolling text`}
          className={cn("shrink-0", className)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <LayersIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-48 whitespace-nowrap"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onSelect={() => run(getContent, sendToBar)}>
          <PanelBottomIcon /> Send to bar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(getContent, sendToScroll)}>
          <TextIcon /> Send to scrolling text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Send to bar and Send to scrolling text, for an existing right-click menu. */
export function SendToOverlayMenuItems({
  getContent,
}: {
  getContent: ContentSource
}) {
  return (
    <>
      <ContextMenuItem onSelect={() => run(getContent, sendToBar)}>
        <PanelBottomIcon />
        Send to bar
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => run(getContent, sendToScroll)}>
        <TextIcon />
        Send to scrolling text
      </ContextMenuItem>
    </>
  )
}

/** Right-click a verse to send it to a bar or to scrolling text. */
export function VerseOverlayMenu({
  verse,
  translation,
  children,
}: {
  verse: Verse
  translation: string
  children: ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-auto min-w-48 whitespace-nowrap">
        <SendToOverlayMenuItems
          getContent={() => verseContent(verse, translation)}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
