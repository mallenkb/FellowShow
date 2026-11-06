import { useEffect, useState } from "react"
import { DownloadIcon } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { invoke } from "@/lib/ipc"

export function SermonAudioDownload({
  id,
  title,
}: {
  id: string
  title: string
}) {
  const [formats, setFormats] = useState(["wav"])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let ignore = false
    void invoke("sermon_audio_formats")
      .then((formats) => {
        if (!ignore) setFormats(formats)
      })
      .catch((error: unknown) => {
        console.warn("Could not check sermon audio formats", error)
      })
    return () => {
      ignore = true
    }
  }, [])

  async function download(format: string) {
    setExporting(true)
    try {
      const name =
        title
          .replace(/[^\p{L}\p{N} _-]/gu, "_")
          .trim()
          .slice(0, 100) || "Sermon"
      const destination = await save({
        defaultPath: `${name}.${format}`,
        filters: [
          { name: `${format.toUpperCase()} audio`, extensions: [format] },
        ],
      })
      if (!destination) return
      await invoke("export_sermon_audio", { sermonId: id, destination, format })
      toast.success("Sermon audio saved")
    } catch (error) {
      toast.error("Could not export sermon audio", {
        description: String(error),
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <DownloadIcon aria-hidden="true" />
          {exporting ? "Exporting…" : "Download audio"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {formats.map((format) => (
          <DropdownMenuItem key={format} onSelect={() => void download(format)}>
            {format.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
