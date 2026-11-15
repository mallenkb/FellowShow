import { Channel } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { create } from "zustand"
import { Button } from "@/components/ui/button"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { invoke, type WhisperModel, type WhisperModelStatus } from "@/lib/ipc"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"

const MODEL_NAMES: Record<WhisperModel, string> = {
  tiny: "Tiny",
  base: "Base",
  small: "Small",
  "small.en": "SermonCast",
  medium: "Medium",
  "large-v3": "Large v3",
  "large-v3-turbo": "Large v3 Turbo",
}

const useModelDownload = create<{
  model: WhisperModel | null
  received: number
}>(() => ({ model: null, received: 0 }))

async function selectModel(model: WhisperModel) {
  useSettingsStore.getState().setWhisperModel(model)
  try {
    await saveSettingsNow()
  } catch (error) {
    toast.error("Could not save the Whisper model selection", {
      description: String(error),
    })
  }
}

async function downloadModel(model: WhisperModel) {
  if (useModelDownload.getState().model) return
  useModelDownload.setState({ model, received: 0 })
  const progress = new Channel<number>()
  progress.onmessage = (received) => {
    if (useModelDownload.getState().model === model) {
      useModelDownload.setState({ received })
    }
  }
  try {
    await invoke("download_whisper_model", { model, progress })
    await selectModel(model)
    toast.success(`${MODEL_NAMES[model]} is ready for offline use`)
  } catch (error) {
    toast.error("Could not download the Whisper model", {
      description: String(error),
    })
  } finally {
    useModelDownload.setState({ model: null, received: 0 })
  }
}

export function useWhisperModels() {
  const { model: downloading, received } = useModelDownload()
  const [models, setModels] = useState<WhisperModelStatus[]>([])
  const [error, setError] = useState<string>()
  const [deleting, setDeleting] = useState(false)
  const [modelListRevision, setModelListRevision] = useState(0)

  async function deleteModel(model: WhisperModel) {
    setDeleting(true)
    try {
      await invoke("delete_whisper_model", { model })
    } catch (failure) {
      toast.error("Could not delete the model", {
        description: String(failure),
      })
    } finally {
      setDeleting(false)
      setModelListRevision((revision) => revision + 1)
    }
  }

  useEffect(() => {
    let ignore = false
    void invoke("list_whisper_models")
      .then((result) => {
        if (ignore) return
        setModels(result)
        setError(undefined)
      })
      .catch((failure: unknown) => {
        if (!ignore) setError(String(failure))
      })
    return () => {
      ignore = true
    }
  }, [downloading, modelListRevision])

  const rows = models.map(({ model, sizeBytes, installed, canDelete }) => {
    const pending = downloading === model
    const percent = Math.min(100, Math.floor((received / sizeBytes) * 100))
    return {
      model,
      installed,
      row: (
        <div
          key={model}
          className="flex flex-wrap items-center gap-3 px-3 py-2.5 has-data-[state=checked]:bg-primary/5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">{MODEL_NAMES[model]}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(sizeBytes / 1024 ** 2)} MiB
              {model === "small.en" ? " · Whisper Small English" : ""}
            </p>
          </div>

          {!installed && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={downloading !== null || deleting}
              aria-label={`Download and use ${MODEL_NAMES[model]}`}
              onClick={() => void downloadModel(model)}
            >
              {pending ? "Downloading…" : "Download and use"}
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={downloading !== null || deleting}
              aria-label={`Delete ${MODEL_NAMES[model]}`}
              onClick={() => void deleteModel(model)}
            >
              Delete
            </Button>
          )}
          {installed && (
            <RadioGroupItem
              className="ml-auto"
              value={model}
              aria-label={`Use ${MODEL_NAMES[model]}`}
              disabled={downloading !== null || deleting}
            />
          )}
          {pending && (
            <progress
              className="w-full"
              max={100}
              value={percent}
              aria-label={`Downloading ${MODEL_NAMES[model]}`}
            />
          )}
        </div>
      ),
    }
  })

  return { rows, error, loading: !error && models.length === 0 }
}
