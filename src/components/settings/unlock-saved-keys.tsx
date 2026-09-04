import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { unlockSecureSettings, useSettingsStore } from "@/stores/settings-store"

export function UnlockSavedKeys() {
  const unlocked = useSettingsStore((state) => state.secretsUnlocked)
  const [loading, setLoading] = useState(false)
  if (unlocked) return null
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 text-xs text-muted-foreground">
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          void unlockSecureSettings()
            .catch(() => {
              toast.error(
                "Saved keys remain locked. Try again when you need cloud features."
              )
            })
            .finally(() => setLoading(false))
        }}
      >
        {loading ? "Unlocking…" : "Unlock saved keys"}
      </Button>
      <span>Only needed for cloud speech, AI, or editing API keys.</span>
    </div>
  )
}
