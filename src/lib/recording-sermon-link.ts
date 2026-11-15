import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSermonStore } from "@/stores/sermon-store"

/**
 * Sermon video follows the sermon: while a sermon is listening and the
 * GoStream return is live, it records. Pausing, ending or closing the app
 * stops it; resuming the sermon (or GoStream coming back) starts a new part.
 */

function reconcile(): void {
  const sermonId = useSermonStore.getState().activeSessionId
  const feed = useReturnFeedStore.getState()
  const recording = useRecordingStore.getState()
  if (recording.status === "starting" || recording.status === "stopping") return

  if (recording.status === "recording") {
    if (
      sermonId === null ||
      sermonId !== recording.sermonId ||
      feed.status !== "live"
    ) {
      void recording.stop().catch((error: unknown) => {
        console.warn("[recording] Failed to stop with the sermon", error)
      })
    }
    return
  }

  if (sermonId === null) return
  const sermon = useSermonStore
    .getState()
    .sessions.find((session) => session.id === sermonId)
  if (!sermon) return
  if (feed.status === "live") {
    void recording
      .start({
        id: sermon.id,
        title: sermon.title,
        startedAt: sermon.startedAt,
      })
      .catch((error: unknown) => {
        console.warn("[recording] Failed to start with the sermon", error)
      })
  }
}

export function initRecordingSermonLink(): () => void {
  const unsubscribers = [
    useSermonStore.subscribe((state, previous) => {
      if (state.activeSessionId !== previous.activeSessionId) reconcile()
    }),
    useReturnFeedStore.subscribe((state, previous) => {
      if (state.status !== previous.status) reconcile()
    }),
    useRecordingStore.subscribe((state, previous) => {
      if (state.status !== previous.status && state.status === "idle")
        reconcile()
    }),
  ]
  reconcile()
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
