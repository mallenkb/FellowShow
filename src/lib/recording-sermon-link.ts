import { toast } from "sonner"
import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSermonStore } from "@/stores/sermon-store"

/**
 * Sermon video follows the sermon: while a sermon is listening and the
 * GoStream return is live, it records. Pausing, ending or closing the app
 * stops it; resuming the sermon (or GoStream coming back) starts a new part.
 */

export function initRecordingSermonLink(): () => void {
  let needsStart = true
  function reconcile(sourceChanged = false): void {
    const sermon = useSermonStore.getState()
    const feed = useReturnFeedStore.getState()
    const recording = useRecordingStore.getState()
    if (sourceChanged) needsStart = true
    if (recording.status === "stopping") return
    if (recording.status === "recording" || recording.status === "starting") {
      if (
        sourceChanged ||
        sermon.activeSessionId !== recording.sermonId ||
        feed.status !== "live"
      ) {
        void recording.stop().catch((error: unknown) => {
          console.warn("[recording] Failed to stop with the sermon", error)
        })
      }
      return
    }

    if (
      !needsStart ||
      feed.status !== "live" ||
      sermon.transition === "pausing"
    )
      return
    const session = sermon.sessions.find(
      (item) => item.id === sermon.activeSessionId
    )
    if (!session) return
    needsStart = false
    void recording
      .start({
        id: session.id,
        title: session.title,
        startedAt: session.startedAt,
      })
      .catch((error: unknown) => {
        console.warn("[recording] Failed to start with the sermon", error)
      })
  }

  const unsubscribers = [
    useSermonStore.subscribe((state, previous) => {
      if (
        state.activeSessionId !== previous.activeSessionId ||
        (state.transition === "pausing") !== (previous.transition === "pausing")
      )
        reconcile(true)
    }),
    useReturnFeedStore.subscribe((state, previous) => {
      if (state.status !== previous.status || state.stream !== previous.stream)
        reconcile(true)
    }),
    useRecordingStore.subscribe((state, previous) => {
      if (state.status === "error" && previous.status !== "error") {
        toast.error("Recording stopped", {
          description: state.error ?? undefined,
        })
      }
      if (
        state.status !== previous.status &&
        (state.status === "idle" ||
          previous.status === "starting" ||
          previous.status === "stopping")
      )
        reconcile()
    }),
  ]
  reconcile()
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
