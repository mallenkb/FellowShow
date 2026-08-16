import { BookOpenIcon, DownloadIcon } from "lucide-react"
import { openSettings } from "@/lib/settings-dialog"
import { Button } from "@/components/ui/button"

export function ScriptureDownloadPrompt({
  className = "",
}: {
  className?: string
}) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center ${className}`}
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
        <BookOpenIcon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          No Scripture downloaded
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Choose a Bible version in Settings to download Scripture for this app.
        </p>
      </div>
      <Button type="button" size="sm" onClick={() => openSettings("bible")}>
        <DownloadIcon className="size-3.5" />
        Download Scripture
      </Button>
    </div>
  )
}
