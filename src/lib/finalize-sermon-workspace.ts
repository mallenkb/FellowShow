import { flushPendingStoreWrites } from "@/lib/debounced-save"
import { finalizeRecording } from "@/stores/recording-store"
import { flushSermonSessions } from "@/stores/sermon-store"

/** Called once the session has released its claim on the return recorder. */
export async function finalizeSermonWorkspace(): Promise<void> {
  try {
    await finalizeRecording()
  } finally {
    // Preserve the transcript even if the video ran out of disk space.
    await flushSermonSessions()
    await flushPendingStoreWrites()
  }
}
