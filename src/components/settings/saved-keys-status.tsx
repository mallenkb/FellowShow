import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { unlockSecureSettings, useSettingsStore } from "@/stores/settings-store"

export function SavedKeysStatus() {
  const unlocked = useSettingsStore((state) => state.secretsUnlocked)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (unlocked) return
    void unlockSecureSettings().catch(() => setFailed(true))
  }, [unlocked])

  if (unlocked) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span role="status">
        {failed
          ? "Could not access saved API keys."
          : "Loading saved API keys…"}
      </span>
      {failed && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setFailed(false)
            void unlockSecureSettings().catch(() => setFailed(true))
          }}
        >
          Retry
        </Button>
      )}
    </div>
  )
}
