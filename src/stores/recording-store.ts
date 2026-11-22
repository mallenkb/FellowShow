import { create } from "zustand"
import { toast } from "sonner"
import {
  createChunkWriter,
  pickRecordingMimeType,
  prepareSermonFolder,
  RecordingUnsupportedError,
  nextVideoPartPath,
  type ChunkWriter,
  type SermonFolderInfo,
} from "@/lib/return-recording"
import { useSermonStore } from "@/stores/sermon-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"

/**
 * Records the GoStream return feed for the sermon that is listening, into
 * that sermon's folder. Each start (or resume) is a new video file. Chunks
 * reach disk every two seconds, so closing the app or a crash loses at most
 * that much, and a later resume adds the next file.
 */

type RecordingStatus = "idle" | "starting" | "recording" | "stopping" | "error"

export interface RecordingState {
  status: RecordingStatus
  sermonId: string | null
  startedAt: number | null
  bytes: number
  error: string | null
  start: (sermon: SermonFolderInfo) => Promise<void>
  stop: () => Promise<void>
}

const TIMESLICE_MS = 2000
const NO_STREAM_ERROR = "Start the GoStream return first."
const WRITE_ERROR = "Could not save the sermon video. Check free disk space."
const START_ERROR =
  "Could not start recording. Check that FellowShow can save to your Videos folder."
const DISCONNECT_WARNING =
  "GoStream disconnected. Video recording continues when it is back."

interface ActiveRecording {
  recorder: MediaRecorder
  writer: ChunkWriter
  track: MediaStreamTrack
  onTrackEnded: () => void
  stopped: Promise<void>
}

let active: ActiveRecording | null = null

function detach(recording: ActiveRecording): void {
  recording.track.removeEventListener("ended", recording.onTrackEnded)
  recording.recorder.ondataavailable = null
  if (active === recording) active = null
}

let generation = 0
let starting: Promise<void> | null = null
let stopping: Promise<void> | null = null
let failedWriter: ChunkWriter | null = null

async function retryFailedWrite() {
  if (failedWriter) {
    await failedWriter.retry()
    failedWriter = null
  }
}

function finish(disconnected: boolean): Promise<void> {
  generation++
  if (stopping) return stopping
  const recording = active
  const pendingStart = starting
  if (!recording && !pendingStart && !failedWriter) return Promise.resolve()

  stopping = Promise.resolve()
    .then(async () => {
      if (pendingStart) await pendingStart
      if (recording) {
        recording.track.removeEventListener("ended", recording.onTrackEnded)
        if (recording.recorder.state !== "inactive") recording.recorder.stop()
        await recording.stopped
        try {
          await recording.writer.flush()
        } catch (error) {
          failedWriter = recording.writer
          throw error
        } finally {
          detach(recording)
        }
      }
      await retryFailedWrite()
    })
    .then(
      () => {
        stopping = null
        useRecordingStore.setState({
          status: "idle",
          sermonId: null,
          startedAt: null,
          error: null,
        })
        if (disconnected) toast.warning(DISCONNECT_WARNING)
      },
      (error: unknown) => {
        stopping = null
        useRecordingStore.setState({
          status: "error",
          error: WRITE_ERROR,
          startedAt: null,
        })
        throw error
      }
    )
  useRecordingStore.setState({ status: "stopping" })
  return stopping
}

export function finalizeRecording(): Promise<void> {
  return finish(false)
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  status: "idle",
  sermonId: null,
  startedAt: null,
  bytes: 0,
  error: null,

  start: (sermon) => {
    const { status } = get()
    if (status !== "idle" && status !== "error")
      return starting ?? Promise.resolve()
    const stream = useReturnFeedStore.getState().stream
    const track = stream?.getVideoTracks()[0]
    if (!stream || !track || track.readyState === "ended") {
      set({ status: "error", error: NO_STREAM_ERROR })
      return Promise.resolve()
    }

    const token = ++generation
    const isCurrent = () => {
      const feed = useReturnFeedStore.getState()
      const session = useSermonStore.getState()
      return (
        token === generation &&
        session.activeSessionId === sermon.id &&
        session.transition !== "pausing" &&
        feed.status === "live" &&
        feed.stream === stream &&
        track.readyState !== "ended"
      )
    }
    const operation: Promise<void> = Promise.resolve()
      .then(async () => {
        if (!isCurrent()) return
        if (failedWriter) {
          await retryFailedWrite()
          if (!isCurrent()) return
        }
        const format = pickRecordingMimeType((type) =>
          MediaRecorder.isTypeSupported(type)
        )
        // Renaming a folder that is being written to would split the video.
        const folder = await prepareSermonFolder(sermon, { allowRename: false })
        if (!isCurrent()) return
        const startedAt = Date.now()
        const path = await nextVideoPartPath(
          folder,
          startedAt,
          format.extension
        )
        if (!isCurrent()) return
        const writer = createChunkWriter(path)
        const recorder = new MediaRecorder(stream, {
          mimeType: format.mimeType,
          videoBitsPerSecond: 6_000_000,
          audioBitsPerSecond: 192_000,
        })

        let markStopped = () => {}
        const stopped = new Promise<void>((resolve) => {
          markStopped = resolve
        })
        const recording: ActiveRecording = {
          recorder,
          writer,
          track,
          stopped,
          onTrackEnded: () => {
            void finish(true).catch((error: unknown) => {
              console.warn("[recording] Failed to finalize video", error)
            })
          },
        }

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size === 0) return
          set((state) => ({ bytes: state.bytes + event.data.size }))
          void writer.write(event.data).catch(() => {
            if (stopping) return
            void finish(false).catch((error: unknown) => {
              console.warn("[recording] Failed to finalize video", error)
            })
          })
        }
        recorder.onstop = () => markStopped()
        track.addEventListener("ended", recording.onTrackEnded)

        active = recording
        recorder.start(TIMESLICE_MS)
        set({ status: "recording", startedAt })
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return
        if (active) detach(active)
        console.warn("[recording] Could not start recording", error)
        set({
          status: "error",
          error:
            error instanceof RecordingUnsupportedError
              ? error.message
              : failedWriter
                ? WRITE_ERROR
                : START_ERROR,
          startedAt: null,
        })
      })
      .finally(() => {
        if (starting !== operation) return
        starting = null
        if (get().status === "starting") set({ status: "idle", sermonId: null })
      })
    starting = operation
    set({ status: "starting", error: null, bytes: 0, sermonId: sermon.id })
    return operation
  },

  stop: finalizeRecording,
}))
