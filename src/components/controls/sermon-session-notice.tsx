import { Button } from "@/components/ui/button"
import { flushSermonSessions, useSermonStore } from "@/stores/sermon-store"

export function SermonSessionNotice() {
  const saveError = useSermonStore((state) => state.saveError)
  if (!saveError) return null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs">
      <p role="alert" className="min-w-0 flex-1 text-destructive">
        {saveError}
      </p>
      <Button
        size="xs"
        variant="outline"
        onClick={() => {
          void flushSermonSessions().catch(console.error)
        }}
      >
        Retry save
      </Button>
    </div>
  )
}
