import { SmartphoneIcon } from "lucide-react"
import { GIVING_ITEM_ID, givingToVerse } from "@/lib/giving"
import { cn } from "@/lib/utils"
import { useAnnouncementStore, useBroadcastStore } from "@/stores"
import {
  LiveStopTag,
  ShowOnLiveButton,
} from "@/components/panels/search/show-on-live-button"
import {
  useIsAnnouncementLive,
  useIsAnyAnnouncementLive,
} from "@/components/panels/search/use-announcement-live"

/** Pinned entry for the offering slide, which belongs to every service. */
export function GivingRow() {
  const selected = useAnnouncementStore((state) => state.givingSelected)
  const hasNumbers = useAnnouncementStore((state) =>
    state.giving.accounts.some((account) => account.number.trim())
  )
  const live = useIsAnnouncementLive(GIVING_ITEM_ID)
  // While something is on Live, only the live row is highlighted.
  const anyLive = useIsAnyAnnouncementLive()

  const showOnLive = () => {
    const broadcast = useBroadcastStore.getState()
    const verse = givingToVerse(
      useAnnouncementStore.getState().giving,
      broadcast.themes
    )
    if (verse) broadcast.presentOnLive(verse, null, "manual")
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-lg border py-1 pr-1 pl-2 transition-colors",
        selected && !anyLive
          ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600]/60 dark:bg-[#F1E600]/5"
          : "border-transparent hover:bg-muted/50",
        live && "border-destructive/70 bg-destructive/10"
      )}
    >
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => useAnnouncementStore.getState().selectGiving()}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <SmartphoneIcon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            Offering: Mobile Money
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {hasNumbers ? "Every service" : "Add your payment numbers"}
          </span>
        </span>
      </button>
      {live ? (
        <LiveStopTag label="The offering slide" />
      ) : (
        <ShowOnLiveButton
          label="the offering slide"
          disabled={!hasNumbers}
          onShow={showOnLive}
        />
      )}
    </div>
  )
}
