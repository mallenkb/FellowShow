import { create } from "zustand"
import {
  announcementPageToVerse,
  paginateAnnouncementSet,
} from "@/lib/announcements"
import type { VerseRenderData } from "@/types"
import { useAnnouncementStore } from "./announcement-store"
import { useBroadcastStore } from "./broadcast-store"

export const LOOP_INTERVAL_OPTIONS = [8, 12, 15, 20] as const
export type LoopIntervalSeconds = (typeof LOOP_INTERVAL_OPTIONS)[number]

interface AnnouncementLoopState {
  runningSetId: string | null
  intervalSeconds: LoopIntervalSeconds
  setIntervalSeconds: (seconds: LoopIntervalSeconds) => void
  /** Puts the set's current notes on Live and cycles them until stopped. */
  start: (setId: string) => boolean
  stop: () => void
}

let timer: ReturnType<typeof setTimeout> | null = null
let unsubscribeLive: (() => void) | null = null
let shownVerse: VerseRenderData | null = null
let pageIndex = 0
/** True while the loop itself is changing Live, so the guard ignores it. */
let advancing = false

function clearLoop() {
  if (timer) clearTimeout(timer)
  timer = null
  unsubscribeLive?.()
  unsubscribeLive = null
  shownVerse = null
  pageIndex = 0
}

// Pages are rebuilt every tick, so edits and newly expired notes apply on the
// next change without restarting the loop.
function showNextPage(setId: string): boolean {
  const set = useAnnouncementStore
    .getState()
    .sets.find((candidate) => candidate.id === setId)
  const pages = set ? paginateAnnouncementSet(set) : []
  const page = pages[pageIndex % Math.max(1, pages.length)]
  if (!set || !page) return false
  pageIndex = (pageIndex + 1) % pages.length
  advancing = true
  try {
    useBroadcastStore
      .getState()
      .presentOnLive(
        announcementPageToVerse(set, page, useBroadcastStore.getState().themes),
        null,
        "manual"
      )
  } finally {
    advancing = false
  }
  shownVerse = useBroadcastStore.getState().liveVerse
  return true
}

function scheduleNext(setId: string) {
  const seconds = useAnnouncementLoopStore.getState().intervalSeconds
  timer = setTimeout(() => {
    if (showNextPage(setId)) scheduleNext(setId)
    else useAnnouncementLoopStore.getState().stop()
  }, seconds * 1000)
}

export const useAnnouncementLoopStore = create<AnnouncementLoopState>(
  (set, get) => ({
    runningSetId: null,
    intervalSeconds: 8,
    setIntervalSeconds: (intervalSeconds) => set({ intervalSeconds }),
    start: (setId) => {
      get().stop()
      if (!showNextPage(setId)) return false
      // Anything else sent to Live (a song, a verse, Clear) or turning Live
      // off ends the loop, so it never takes the screen back from the operator.
      unsubscribeLive = useBroadcastStore.subscribe((state) => {
        if (advancing) return
        if (state.liveVerse !== shownVerse || !state.isLive) get().stop()
      })
      set({ runningSetId: setId })
      scheduleNext(setId)
      return true
    },
    stop: () => {
      clearLoop()
      if (get().runningSetId !== null) set({ runningSetId: null })
    },
  })
)
