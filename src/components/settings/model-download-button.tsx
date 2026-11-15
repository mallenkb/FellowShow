import { LoaderCircleIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { invoke } from "@/lib/ipc"

interface ModelDownloadButtonProps {
  name: string
  kind: "whisper" | "local-speech"
  disabled: boolean
  onDownload: () => void
  progress?: { percent?: number; status: string }
}

export function ModelDownloadButton({
  name,
  kind,
  disabled,
  onDownload,
  progress,
}: ModelDownloadButtonProps) {
  const [canceling, setCanceling] = useState(false)

  async function cancel() {
    setCanceling(true)
    try {
      await invoke("cancel_transcription_model_download", { kind })
    } catch (error) {
      toast.error("Could not cancel the download", {
        description: String(error),
      })
    } finally {
      setCanceling(false)
    }
  }

  if (!progress) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        aria-label={`Download and use ${name}`}
        onClick={onDownload}
      >
        Download and use
      </Button>
    )
  }

  const percent = progress.percent
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="group relative min-w-32 overflow-hidden"
      disabled={canceling}
      aria-label={`Cancel download of ${name}`}
      aria-description={progress.status}
      title={progress.status}
      onClick={() => void cancel()}
    >
      {percent !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 bg-primary/15 transition-[width] group-hover:opacity-40 group-focus-visible:opacity-40"
          style={{ width: `${percent}%` }}
        />
      )}
      <span
        aria-hidden="true"
        className="relative grid items-center justify-items-center"
      >
        <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 group-hover:invisible group-focus-visible:invisible">
          {percent === undefined ? (
            <>
              <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
              Downloading…
            </>
          ) : (
            `Downloading ${percent}%`
          )}
        </span>
        <span className="invisible col-start-1 row-start-1 text-destructive group-hover:visible group-focus-visible:visible">
          Cancel
        </span>
      </span>
    </Button>
  )
}
