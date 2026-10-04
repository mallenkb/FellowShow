import { useAnnouncementLoopStore, useBroadcastStore } from "@/stores"
import { paginateAnnouncementSet } from "@/lib/announcements"
import type { AnnouncementSet } from "@/types"

/** True while the given note (or the offering slide) is on Live. */
export function useIsAnnouncementLive(itemId: string): boolean {
  return useBroadcastStore(
    (state) =>
      state.isLive &&
      state.liveVerse?.announcementItemIds?.includes(itemId) === true
  )
}

/**
 * The note the running loop will show next. Manual presentation has no NEXT
 * marker. Wraps to the first note while the loop is cycling this set.
 */
export function useNextAnnouncementId(
  set: AnnouncementSet | null
): string | null {
  const liveId = useBroadcastStore((state) =>
    state.isLive ? (state.liveVerse?.announcementItemIds?.[0] ?? null) : null
  )
  const looping = useAnnouncementLoopStore(
    (state) => set !== null && state.runningSetId === set.id
  )
  if (!set || !liveId || !looping) return null
  const order = paginateAnnouncementSet(set).flatMap((page) => {
    const id = set.items[(page.items[0]?.number ?? 0) - 1]?.id
    return id ? [id] : []
  })
  const index = order.indexOf(liveId)
  if (index < 0) return null
  const next = order[index + 1] ?? order[0]
  return next && next !== liveId ? next : null
}

/** True while any note or the offering slide is on Live. */
export function useIsAnyAnnouncementLive(): boolean {
  return useBroadcastStore(
    (state) =>
      state.isLive && (state.liveVerse?.announcementItemIds?.length ?? 0) > 0
  )
}
