import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { invoke } from "@/lib/ipc"
import {
  saveSettingsNow,
  useSettingsStore,
  type CloudSttProvider,
} from "@/stores/settings-store"

const defaults: Record<CloudSttProvider, string> = {
  deepgram: "nova-3",
  openai: "gpt-live-transcribe",
  groq: "whisper-large-v3-turbo",
}

const guide: Record<string, { name: string; detail: string }> = {
  "nova-3": {
    name: "Nova-3 (recommended)",
    detail:
      "Recommended for live sermons. Streams as you speak and uses Bible term hints.",
  },
  "nova-2": {
    name: "Nova-2",
    detail:
      "An older streaming model. Try it if Nova-3 struggles with your audio.",
  },
  "gpt-live-transcribe": {
    name: "GPT Live Transcribe (recommended)",
    detail: "Shows words as you speak.",
  },
  "gpt-transcribe": {
    name: "GPT Transcribe",
    detail: "Shows text after each audio chunk finishes.",
  },
  "gpt-4o-mini-transcribe": {
    name: "GPT-4o mini Transcribe",
    detail:
      "Lower-cost legacy model. OpenAI plans to retire it February 26, 2027.",
  },
  "gpt-4o-transcribe": {
    name: "GPT-4o Transcribe",
    detail: "Legacy model. OpenAI plans to retire it February 26, 2027.",
  },
  "whisper-large-v3-turbo": {
    name: "Whisper Large v3 Turbo (faster)",
    detail:
      "Shows text in short chunks. Groq reports 12% word error and bills at least 10 seconds per request.",
  },
  "whisper-large-v3": {
    name: "Whisper Large v3 (more accurate)",
    detail:
      "Shows text in short chunks. Groq reports 10.3% word error and bills at least 10 seconds per request.",
  },
}

export function CloudTranscriptionModelPicker({
  provider,
  apiKey,
}: {
  provider: CloudSttProvider
  apiKey: string
}) {
  const saved = useSettingsStore((state) => state.cloudSttModels[provider])
  const selected = saved || defaults[provider]
  const [models, setModels] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (provider !== "deepgram" && !apiKey && revision === 0) return
    let ignore = false
    setModels([])
    setStatus("")
    setLoading(true)
    void invoke("list_cloud_transcription_models", { provider, apiKey })
      .then((available) => {
        if (ignore) return
        setModels(available)
        if (available.length === 0) {
          setStatus(
            "This provider didn’t list any compatible transcription models."
          )
        } else if (
          !available.includes(
            useSettingsStore.getState().cloudSttModels[provider] ||
              defaults[provider]
          )
        ) {
          setStatus(
            "Your current model isn’t in the provider’s list. Choose an available model."
          )
        }
      })
      .catch((error: unknown) => {
        if (!ignore) setStatus(String(error))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [apiKey, provider, revision])

  async function chooseModel(model: string) {
    if (!models.includes(model)) return
    useSettingsStore.getState().setCloudSttModel(provider, model)
    setStatus("")
    await saveSettingsNow()
  }

  return (
    <div className="grid gap-2">
      <label htmlFor="cloud-transcript-model" className="text-xs font-medium">
        Model
      </label>
      <div className="flex flex-wrap gap-2">
        <Select
          value={models.includes(selected) ? selected : ""}
          disabled={loading || models.length === 0}
          onValueChange={(model) =>
            void chooseModel(model).catch(() =>
              toast.error("Could not save the transcription model")
            )
          }
        >
          <SelectTrigger id="cloud-transcript-model" className="min-w-0 flex-1">
            <SelectValue placeholder={guide[selected]?.name ?? selected} />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {guide[model]?.name ?? model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          {loading
            ? "Loading…"
            : models.length
              ? "Refresh models"
              : "Load models"}
        </Button>
      </div>
      {guide[selected] && (
        <p className="text-xs text-muted-foreground">
          {guide[selected].detail}
        </p>
      )}
      {status && (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  )
}
