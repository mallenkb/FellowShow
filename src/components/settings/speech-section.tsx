import { invoke } from "@/lib/ipc"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"
import { CheckIcon } from "lucide-react"
import { CloudTranscriptionModelPicker } from "./cloud-transcription-model-picker"
import { SavedKeysStatus } from "./saved-keys-status"
import { SpeechModelPicker } from "./speech-model-picker"

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

  const cloudProviderName =
    sttProvider === "deepgram"
      ? "Deepgram"
      : sttProvider === "openai"
        ? "OpenAI"
        : "Groq"
  const activeApiKey =
    sttProvider === "deepgram"
      ? deepgramApiKey
      : sttProvider === "openai"
        ? openaiApiKey
        : sttProvider === "groq"
          ? groqApiKey
          : null
  const [keyDraft, setKeyDraft] = useState<{
    provider: typeof sttProvider
    value: string
  } | null>(null)
  const keyValue =
    keyDraft?.provider === sttProvider ? keyDraft.value : (activeApiKey ?? "")
  const [saved, setSaved] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    setKeyDraft(null)
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
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <label htmlFor="transcript-provider" className="text-xs font-medium">
          Provider
        </label>
        <Select
          value={sttProvider}
          onValueChange={(value) => {
            if (
              value === "deepgram" ||
              value === "openai" ||
              value === "groq" ||
              value === "whisper"
            )
              setSttProvider(value)
          }}
        >
          <SelectTrigger id="transcript-provider" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deepgram">Deepgram</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="groq">Groq</SelectItem>
            <SelectItem value="whisper">Local</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sttProvider !== "whisper" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Input
              type="password"
              disabled={!secretsUnlocked}
              aria-label={`${cloudProviderName} API key`}
              placeholder={`Enter your ${cloudProviderName} API key`}
              value={keyValue}
              onChange={(e) =>
                setKeyDraft({ provider: sttProvider, value: e.target.value })
              }
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
          <SavedKeysStatus />
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

      {sttProvider !== "whisper" && <hr className="border-border" />}

      {sttProvider === "whisper" ? (
        <>
          <p className="text-xs text-muted-foreground">
            For live English sermons, try Parakeet Unified. For multilingual
            sermons, start with Parakeet v3.
          </p>
          <SpeechModelPicker />
        </>
      ) : (
        <CloudTranscriptionModelPicker
          key={sttProvider}
          provider={sttProvider}
          apiKey={activeApiKey ?? ""}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Display Mode                                                     */
/* -------------------------------------------------------------------------- */
