import { invoke } from "@/lib/ipc"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"
import { CheckIcon, CloudIcon, MonitorIcon } from "lucide-react"

export function SpeechSection() {
  const {
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
    if (sttProvider === "deepgram") setDeepgramApiKey(keyValue || null)
    if (sttProvider === "openai") setOpenaiApiKey(keyValue || null)
    if (sttProvider === "groq") setGroqApiKey(keyValue || null)
    await saveSettingsNow()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
    <div className="flex flex-col gap-6">
      {/* Provider selector */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Provider
        </label>

        <RadioGroup
          value={sttProvider}
          onValueChange={(v) =>
            setSttProvider(v as "deepgram" | "openai" | "groq" | "whisper")
          }
          className="gap-3"
        >
          {/* Deepgram (cloud) */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
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
                Uses Deepgram Nova-3 for real-time streaming transcription.
                Requires an API key and internet connection. Best accuracy with
                keyword boosting for Bible terms.
              </p>
            </div>
            <CloudIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              sttProvider !== "openai" ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="openai" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (OpenAI)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses OpenAI gpt-4o-mini-transcribe on short audio chunks. Good
                for accurate cloud transcription when low-latency partials are
                not required.
              </p>
            </div>
            <CloudIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              sttProvider !== "groq" ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="groq" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (Groq)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses Groq whisper-large-v3-turbo on short audio chunks. Fast
                cloud transcription through Groq's OpenAI-compatible API.
              </p>
            </div>
            <CloudIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>

          {/* Whisper (local) */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
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
                Runs Whisper large-v3-turbo locally on your device. Fully
                offline, no API key needed. Audio never leaves your machine.
              </p>
            </div>
            <MonitorIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>
        </RadioGroup>
      </div>

      {sttProvider !== "whisper" && (
        <div className="flex flex-col gap-2">
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
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={`Enter your ${sttProvider === "deepgram" ? "Deepgram" : sttProvider === "openai" ? "OpenAI" : "Groq"} API key...`}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="flex-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleTestConnection()}
              disabled={testingConnection || keyValue.trim().length === 0}
            >
              {testingConnection ? "Testing..." : "Test"}
            </Button>
            <Button size="sm" onClick={() => void handleSaveKey()}>
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
          <p className="text-[0.625rem] text-muted-foreground">
            Required for this cloud transcription provider.
          </p>
          {connectionResult && (
            <p
              className={`text-[0.625rem] ${
                connectionResult.ok ? "text-emerald-600" : "text-red-500"
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
