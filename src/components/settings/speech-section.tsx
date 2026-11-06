import { invoke } from "@/lib/ipc"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"
import { CheckIcon } from "lucide-react"
import { UnlockSavedKeys } from "./unlock-saved-keys"

export function SpeechSection() {
  const {
    secretsUnlocked,
    sttProvider,
    setSttProvider,
    deepgramApiKey,
    setDeepgramApiKey,
    openaiApiKey,
    setOpenaiApiKey,
    groqApiKey,
    setGroqApiKey,
  } = useSettingsStore()

  const activeApiKey =
    sttProvider === "deepgram"
      ? deepgramApiKey
      : sttProvider === "openai"
        ? openaiApiKey
        : sttProvider === "groq"
          ? groqApiKey
          : null
  const [keyValue, setKeyValue] = useState(activeApiKey ?? "")
  const [saved, setSaved] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    setKeyValue(activeApiKey ?? "")
    setConnectionResult(null)
    setSaved(false)
  }, [activeApiKey, sttProvider])

  const handleSaveKey = async () => {
    const key = keyValue.trim() || null
    if (sttProvider === "deepgram") setDeepgramApiKey(key)
    if (sttProvider === "openai") setOpenaiApiKey(key)
    if (sttProvider === "groq") setGroqApiKey(key)
    try {
      await saveSettingsNow()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save API key"
      )
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionResult(null)
    try {
      const command =
        sttProvider === "deepgram"
          ? "test_deepgram_connection"
          : sttProvider === "openai"
            ? "test_openai_connection"
            : "test_groq_connection"
      const result = await invoke(command, {
        apiKey: keyValue,
      })
      setConnectionResult(result)
    } catch (e) {
      setConnectionResult({ ok: false, message: String(e) })
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="@container/speech flex flex-col gap-6">
      {/* Provider selector */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Provider
        </label>

        <RadioGroup
          aria-label="Speech recognition provider"
          value={sttProvider}
          onValueChange={(v) =>
            setSttProvider(v as "deepgram" | "openai" | "groq" | "whisper")
          }
          className="grid gap-3 @[34rem]/speech:grid-cols-2"
        >
          {/* Deepgram (cloud) */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary-emphasis/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary-emphasis/20 ${
              sttProvider !== "deepgram"
                ? "hover:border-muted-foreground/25"
                : ""
            }`}
          >
            <RadioGroupItem value="deepgram" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (Deepgram)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Nova-3 streams transcription with Bible term support. Requires
                an API key and internet connection.
              </p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary-emphasis/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary-emphasis/20 ${
              sttProvider !== "openai" ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="openai" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (OpenAI)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses gpt-4o-mini-transcribe on short audio chunks.
              </p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary-emphasis/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary-emphasis/20 ${
              sttProvider !== "groq" ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="groq" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (Groq)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses whisper-large-v3-turbo on short audio chunks.
              </p>
            </div>
          </label>

          {/* Whisper (local) */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary-emphasis/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary-emphasis/20 ${
              sttProvider !== "whisper"
                ? "hover:border-muted-foreground/25"
                : ""
            }`}
          >
            <RadioGroupItem value="whisper" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Local (Whisper)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Runs Whisper large-v3-turbo offline. Audio stays on your device
                and no API key is needed.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {sttProvider !== "whisper" && (
        <div className="flex flex-col gap-2">
          <UnlockSavedKeys />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {sttProvider === "deepgram"
                ? "Deepgram"
                : sttProvider === "openai"
                  ? "OpenAI"
                  : "Groq"}{" "}
              API Key
            </label>
            {activeApiKey && (
              <Badge variant="outline" className="text-[0.5rem]">
                Key configured
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="password"
              disabled={!secretsUnlocked}
              placeholder={`Enter your ${sttProvider === "deepgram" ? "Deepgram" : sttProvider === "openai" ? "OpenAI" : "Groq"} API key...`}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="min-w-0 flex-[1_1_12rem] text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleTestConnection()}
              disabled={testingConnection || keyValue.trim().length === 0}
            >
              {testingConnection ? "Testing..." : "Test"}
            </Button>
            <Button
              size="sm"
              disabled={!secretsUnlocked}
              onClick={() => void handleSaveKey()}
            >
              {saved ? (
                <>
                  <CheckIcon className="size-3" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {connectionResult && (
            <p
              className={`text-[0.625rem] ${
                connectionResult.ok
                  ? "text-emerald-700 dark:text-emerald-600"
                  : "text-red-700 dark:text-red-500"
              }`}
            >
              {connectionResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Display Mode                                                     */
/* -------------------------------------------------------------------------- */
