import { useEffect, useState } from "react"
import { CheckIcon, KeyRoundIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEFAULT_OPENROUTER_MODEL } from "@/lib/openrouter"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"

export function AiModelSection() {
  const configuredKey = useSettingsStore((state) => state.openRouterApiKey)
  const configuredModel = useSettingsStore((state) => state.openRouterModel)
  const setApiKey = useSettingsStore((state) => state.setOpenRouterApiKey)
  const setModel = useSettingsStore((state) => state.setOpenRouterModel)
  const [apiKey, setApiKeyValue] = useState(configuredKey ?? "")
  const [model, setModelValue] = useState(configuredModel)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setApiKeyValue(configuredKey ?? "")
  }, [configuredKey])

  useEffect(() => {
    setModelValue(configuredModel)
  }, [configuredModel])

  const save = async () => {
    setApiKey(apiKey.trim() || null)
    setModel(model.trim() || DEFAULT_OPENROUTER_MODEL)
    await saveSettingsNow()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2_000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/15 p-3">
        <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-medium">OpenRouter AI model</p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
            Related Scriptures, Live Notes, and Summary use this model when a
            key is configured. Without a key, direct transcript references and
            manual workflows remain available.
          </p>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          <KeyRoundIcon className="size-3" /> OpenRouter API key
          {configuredKey ? (
            <Badge variant="outline" className="text-[0.5rem] normal-case">
              Key configured
            </Badge>
          ) : null}
        </span>
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKeyValue(event.target.value)}
          placeholder="Paste your OpenRouter API key"
          autoComplete="off"
          className="text-xs"
        />
        <span className="text-[0.625rem] leading-relaxed text-muted-foreground">
          Stored through FellowShow’s existing settings store. It is never
          shown in logs or sent anywhere except OpenRouter requests.
        </span>
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Model ID
        </span>
        <Input
          type="text"
          value={model}
          onChange={(event) => setModelValue(event.target.value)}
          placeholder={DEFAULT_OPENROUTER_MODEL}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className="font-mono text-xs"
        />
        <span className="text-[0.625rem] leading-relaxed text-muted-foreground">
          Paste any compatible OpenRouter model ID, for example{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.625rem]">
            {DEFAULT_OPENROUTER_MODEL}
          </code>
          .
        </span>
      </label>

      <div>
        <Button
          type="button"
          onClick={() =>
            void save().catch(() =>
              toast.error("Could not save AI model settings")
            )
          }
        >
          {saved ? (
            <>
              <CheckIcon className="size-3" /> Saved
            </>
          ) : (
            "Save AI model settings"
          )}
        </Button>
      </div>
    </div>
  )
}
