import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { invoke } from "@/lib/ipc"
import { renderSermonCover } from "@/lib/sermon-cover"
import { formatSermonSummaryExport } from "@/lib/sermon-summary-layout"
import type { SermonSession } from "@/types"

export function SermonBundleDownload({
  session,
  lines,
}: {
  session: SermonSession
  lines: readonly { displayText: string }[]
}) {
  const [saving, setSaving] = useState(false)

  async function download() {
    setSaving(true)
    try {
      const name =
        session.title
          .replace(/[^\p{L}\p{N} _-]/gu, "_")
          .trim()
          .slice(0, 100) || "Sermon"
      const destination = await save({
        defaultPath: `${name}.zip`,
        filters: [{ name: "ZIP archive", extensions: ["zip"] }],
      })
      if (!destination) return

      const transcript = lines
        .map(({ displayText }) => displayText)
        .join("\n")
        .trim()
      const summary = formatSermonSummaryExport(session)
      const hasAudio = await invoke("export_sermon_bundle", {
        sermonId: session.id,
        destination,
        content: {
          coverPng: await renderSermonCover(session),
          transcript: transcript ? `${transcript}\n` : "",
          summary,
        },
      })
      const missing = [
        ...(!transcript ? ["transcript"] : []),
        ...(!summary ? ["summary"] : []),
        ...(!hasAudio ? ["audio"] : []),
      ]
      toast.success("Sermon download saved", {
        description: missing.length
          ? `Missing from this session: ${missing.join(", ")}.`
          : undefined,
      })
    } catch (error) {
      toast.error("Could not save the sermon download", {
        description: String(error),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button
      className="w-full shrink-0"
      variant="outline"
      size="sm"
      disabled={saving}
      aria-label={
        saving ? "Preparing sermon download" : "Download all sermon files"
      }
      onClick={() => void download()}
    >
      <DownloadIcon aria-hidden="true" />
      {saving ? "Preparing download…" : "Download all"}
    </Button>
  )
}
