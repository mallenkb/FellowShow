import { create } from "zustand"
import { join } from "@tauri-apps/api/path"
import { toast } from "sonner"
import {
  createChunkWriter,
  pickRecordingMimeType,
  prepareSermonFolder,
  RecordingUnsupportedError,
  videoPartName,
  type ChunkWriter,
  type SermonFolderInfo,
} from "@/lib/return-recording"
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
  failed: boolean
}

let active: ActiveRecording | null = null

function detach(recording: ActiveRecording): void {
  recording.track.removeEventListener("ended", recording.onTrackEnded)
  recording.recorder.ondataavailable = null
  if (active === recording) active = null
}

function failWrite(recording: ActiveRecording, error: unknown): void {
  if (recording.failed) return
  recording.failed = true
  console.warn("[recording] Failed to write the sermon video", error)
  detach(recording)
  if (recording.recorder.state !== "inactive") {
    try {
      recording.recorder.stop()
    } catch (stopError) {
      console.warn("[recording] Failed to stop the recorder", stopError)
    }
  }
  useRecordingStore.setState({
    status: "error",
    error: WRITE_ERROR,
    startedAt: null,
  })
}

async function finish(disconnected: boolean): Promise<void> {
  const recording = active
  if (!recording || useRecordingStore.getState().status !== "recording") return
  useRecordingStore.setState({ status: "stopping" })
  recording.track.removeEventListener("ended", recording.onTrackEnded)

  if (recording.recorder.state !== "inactive") recording.recorder.stop()
  await recording.stopped
  try {
    await recording.writer.flush()
  } catch (error) {
    failWrite(recording, error)
    return
  }
  if (recording.failed) return
  detach(recording)
  useRecordingStore.setState({
    status: "idle",
    sermonId: null,
    startedAt: null,
  })
  if (disconnected) toast.warning(DISCONNECT_WARNING)
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  status: "idle",
  sermonId: null,
  startedAt: null,
  bytes: 0,
  error: null,

  start: async (sermon) => {
    const { status } = get()
    if (status !== "idle" && status !== "error") return
    const stream = useReturnFeedStore.getState().stream
    const track = stream?.getVideoTracks()[0]
    if (!stream || !track || track.readyState === "ended") {
      set({ status: "error", error: NO_STREAM_ERROR })
      return
    }

    set({ status: "starting", error: null, bytes: 0, sermonId: sermon.id })
    try {
      const format = pickRecordingMimeType((type) =>
        MediaRecorder.isTypeSupported(type)
      )
      // Renaming a folder that is being written to would split the video.
      const folder = await prepareSermonFolder(sermon, { allowRename: false })
      const startedAt = Date.now()
      const path = await join(
        folder,
        videoPartName(startedAt, format.extension)
      )
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
        failed: false,
        onTrackEnded: () => {
          void finish(true).catch((error: unknown) => {
            failWrite(recording, error)
          })
        },
      }

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size === 0) return
        set((state) => ({ bytes: state.bytes + event.data.size }))
        void writer.write(event.data).catch((error: unknown) => {
          failWrite(recording, error)
        })
      }
      recorder.onstop = () => markStopped()
      track.addEventListener("ended", recording.onTrackEnded)

      active = recording
      recorder.start(TIMESLICE_MS)
      set({ status: "recording", startedAt })
    } catch (error) {
      if (active) detach(active)
      console.warn("[recording] Could not start recording", error)
      set({
        status: "error",
        error:
          error instanceof RecordingUnsupportedError
            ? error.message
            : START_ERROR,
        startedAt: null,
      })
    }
  },

  stop: () => finish(false),
}))
