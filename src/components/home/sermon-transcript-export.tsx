import { useState } from "react"
import { CopyIcon, DownloadIcon } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

async function copyText(text: string, button: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // The clipboard API can be unavailable in the desktop webview.
  }

  const field = document.createElement("textarea")
  field.value = text
  field.readOnly = true
  field.tabIndex = -1
  field.className = "pointer-events-none fixed opacity-0"
  const container = button.closest("[role=dialog]") ?? document.body
  container.append(field)
  try {
    field.select()
    if (!document.execCommand("copy")) throw new Error("Clipboard unavailable")
  } finally {
    field.remove()
    button.focus({ preventScroll: true })
  }
}

export function SermonTranscriptExport({
  title,
  lines,
}: {
  title: string
  lines: readonly { displayText: string }[]
}) {
  const [saving, setSaving] = useState(false)
  const hasText = lines.some(({ displayText }) => displayText.trim())
  const transcriptText = () =>
    lines
      .map(({ displayText }) => displayText)
      .join("\n")
      .trim()

  async function copy(button: HTMLButtonElement) {
    try {
      await copyText(transcriptText(), button)
      toast.success("Transcript copied")
    } catch (error) {
      toast.error("Could not copy transcript", { description: String(error) })
    }
  }

  async function download() {
    setSaving(true)
    try {
      const name =
        title
          .replace(/[^\p{L}\p{N} _-]/gu, "_")
          .trim()
          .slice(0, 100) || "Sermon"
      const path = await save({
        defaultPath: `${name} transcript.txt`,
        filters: [{ name: "Plain text", extensions: ["txt"] }],
      })
      if (!path) return
      await writeTextFile(path, `${transcriptText()}\n`)
      toast.success("Transcript saved")
    } catch (error) {
      toast.error("Could not save transcript", { description: String(error) })
    } finally {
      setSaving(false)
    }
  }

  if (!hasText) return null

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label="Copy transcript"
        onClick={(event) => void copy(event.currentTarget)}
      >
        <CopyIcon aria-hidden="true" />
        Copy
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-label={saving ? "Saving transcript" : "Download transcript"}
        disabled={saving}
        onClick={() => void download()}
      >
        <DownloadIcon aria-hidden="true" />
        {saving ? "Saving…" : "Download"}
      </Button>
    </div>
  )
}
