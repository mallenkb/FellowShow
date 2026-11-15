import { useState } from "react"
import { join } from "@tauri-apps/api/path"
import { writeTextFile } from "@tauri-apps/plugin-fs"
import { openPath } from "@tauri-apps/plugin-opener"
import { FolderOpenIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { invoke } from "@/lib/ipc"
import { prepareSermonFolder } from "@/lib/return-recording"
import { formatSermonSummaryExport } from "@/lib/sermon-summary-layout"
import { useRecordingStore } from "@/stores/recording-store"
import type { SermonSession } from "@/types"

async function saveAudio(sermonId: string, folder: string): Promise<boolean> {
  const formats = await invoke("sermon_audio_formats")
  const format = formats.includes("m4a") ? "m4a" : "wav"
  try {
    await invoke("export_sermon_audio", {
      sermonId,
      destination: await join(folder, `Audio.${format}`),
      format,
    })
    return true
  } catch (error) {
    // A sermon without saved audio is normal; other failures are reported.
    if (!String(error).includes("no saved audio")) throw error
    return false
  }
}

/**
 * Gathers the sermon's video, audio, transcript and notes in its folder in
 * Videos/FellowShow (named after the sermon) and opens that folder.
 */
export function SermonFolderButton({
  session,
  lines,
  isLive,
}: {
  session: SermonSession
  lines: readonly { displayText: string }[]
  isLive: boolean
}) {
  const [working, setWorking] = useState(false)
  const recordingHere = useRecordingStore(
    (s) =>
      s.status !== "idle" && s.status !== "error" && s.sermonId === session.id
  )

  async function open() {
    setWorking(true)
    try {
      const folder = await prepareSermonFolder(
        { id: session.id, title: session.title, startedAt: session.startedAt },
        { allowRename: !recordingHere }
      )
      const transcript = lines
        .map(({ displayText }) => displayText)
        .join("\n")
        .trim()
      if (transcript)
        await writeTextFile(
          await join(folder, "Transcript.txt"),
          `${transcript}\n`
        )
      const notes = formatSermonSummaryExport(session)
      if (notes)
        await writeTextFile(
          await join(folder, "Sermon notes.txt"),
          `${notes}\n`
        )
      // Audio is written when listening stops, so it joins after a pause.
      if (!isLive) {
        try {
          await saveAudio(session.id, folder)
        } catch (error) {
          toast.error("Could not add the sermon audio", {
            description: String(error),
          })
        }
      }
      await openPath(folder)
    } catch (error) {
      toast.error("Could not open the sermon folder", {
        description: String(error),
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button
      className="w-full shrink-0"
      variant="outline"
      size="sm"
      disabled={working}
      onClick={() => void open()}
    >
      <FolderOpenIcon aria-hidden="true" />
      {working ? "Preparing folder…" : "Show in folder"}
    </Button>
  )
}
