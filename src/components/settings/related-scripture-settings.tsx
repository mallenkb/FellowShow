import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SavedKeysStatus } from "@/components/settings/saved-keys-status"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"

export function RelatedScriptureSettings() {
  const enabled = useSettingsStore((state) => state.relatedScriptureAiEnabled)
  const setEnabled = useSettingsStore(
    (state) => state.setRelatedScriptureAiEnabled
  )
  const unlocked = useSettingsStore((state) => state.secretsUnlocked)
  const storedKey = useSettingsStore((state) => state.decisionsApiKey)
  const setStoredKey = useSettingsStore((state) => state.setDecisionsApiKey)
  const [keyDraft, setKeyDraft] = useState<string | null>(null)
  const key = keyDraft ?? storedKey ?? ""
  const [saving, setSaving] = useState(false)

  async function saveKey() {
    setSaving(true)
    try {
      setStoredKey(key.trim() || null)
      await saveSettingsNow()
      toast.success("Scripture matching key saved")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="space-y-3 border-t border-border pt-5"
      aria-labelledby="related-ai-settings"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 id="related-ai-settings" className="text-sm font-medium">
            AI related scripture matching
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Send recent sermon transcript and candidate verses to OpenAI to rank
            and label related scriptures. Local matches are available without
            AI.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable AI related scripture matching"
        />
      </div>
      <SavedKeysStatus />
      <label className="grid gap-2">
        <span className="text-xs font-medium">OpenAI Decisions API key</span>
        <Input
          type="password"
          value={key}
          disabled={!unlocked}
          onChange={(event) => setKeyDraft(event.target.value)}
          placeholder="Optional"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="text-xs text-muted-foreground">
          A key needs Decisions write access. It is stored in your system
          credential vault.
        </span>
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!unlocked || saving}
        onClick={() => {
          void saveKey().catch(() => {
            toast.error("Could not save the scripture matching key")
          })
        }}
      >
        {saving ? "Saving…" : "Save scripture matching key"}
      </Button>
    </section>
  )
}
