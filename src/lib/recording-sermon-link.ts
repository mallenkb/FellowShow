import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSermonStore } from "@/stores/sermon-store"

/**
 * Sermon video follows the sermon: while a sermon is listening and the
 * GoStream return is live, it records. Pausing, ending or closing the app
 * stops it; resuming the sermon (or GoStream coming back) starts a new part.
 */

function startFeed(): void {
  void useReturnFeedStore
    .getState()
    .start()
    .catch((error: unknown) => {
      console.warn("[recording] Could not start the GoStream return", error)
    })
}

function savedSourcePresent(): boolean {
  const state = useReturnFeedStore.getState()
  return (
    (state.status === "off" || state.status === "error") &&
    state.videoDeviceId !== null &&
    state.devices.video.some(
      (device) => device.deviceId === state.videoDeviceId
    )
  )
}

function reconcile(sermonStarted: boolean): void {
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
  } else if (
    sermonStarted &&
    feed.status !== "requesting" &&
    feed.videoDeviceId !== null
  ) {
    // The sermon started without GoStream connected: try the saved source.
    startFeed()
  }
}

/** Connects to the saved GoStream source when it is plugged in. */
function connectSavedReturnFeed(): void {
  const feed = useReturnFeedStore.getState()
  if (feed.status !== "off" || feed.videoDeviceId === null) return
  void feed
    .refreshDevices()
    .then(() => {
      if (savedSourcePresent()) startFeed()
    })
    .catch((error: unknown) => {
      console.warn("[recording] Could not list video sources", error)
    })
}

export function initRecordingSermonLink(): () => void {
  connectSavedReturnFeed()
  const unsubscribers = [
    useSermonStore.subscribe((state, previous) => {
      if (state.activeSessionId !== previous.activeSessionId)
        reconcile(state.activeSessionId !== null)
    }),
    useReturnFeedStore.subscribe((state, previous) => {
      if (state.status !== previous.status) reconcile(false)
      // GoStream plugged in (again) after launch: the device watch lists it.
      if (state.devices !== previous.devices && savedSourcePresent())
        startFeed()
    }),
    useRecordingStore.subscribe((state, previous) => {
      if (state.status !== previous.status && state.status === "idle")
        reconcile(false)
    }),
  ]
  reconcile(false)
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
