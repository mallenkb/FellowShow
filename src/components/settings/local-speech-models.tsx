import { Channel } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { create } from "zustand"

import { ModelDownloadButton } from "./model-download-button"
import { Button } from "@/components/ui/button"
import { RadioGroupItem } from "@/components/ui/radio-group"
import {
  invoke,
  type LocalSpeechModel,
  type LocalSpeechModelStatus,
} from "@/lib/ipc"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"

const MODELS: Record<LocalSpeechModel, { name: string; detail: string }> = {
  nemotron: {
    name: "NVIDIA Nemotron 3.5 ASR Streaming 0.6B",
    detail: "Multilingual · Live streaming · 682 MB",
  },
  moonshine: {
    name: "Moonshine Medium Streaming",
    detail: "English · Live streaming · Apple Silicon requires macOS 15+",
  },
  zipformer: {
    name: "Zipformer",
    detail: "English · Bible book vocabulary · 73 MB",
  },
  voxtral: {
    name: "Voxtral Mini 4B Realtime",
    detail: "Multilingual · Apple Silicon · 3.1 GB",
  },
  parakeet: {
    name: "NVIDIA Parakeet TDT 0.6B v3",
    detail: "Default · Multilingual · 671 MB",
  },
  "parakeet-ultra": {
    name: "Parakeet Ultra",
    detail: "Multilingual · 671 MB",
  },
  "parakeet-unified": {
    name: "Parakeet Unified",
    detail: "English · Streaming · 663 MB",
  },
  "parakeet-redux": {
    name: "Parakeet Redux",
    detail: "Multilingual · 169 MB download · 407 MB installed",
  },
}

const useDownload = create<{
  pending: LocalSpeechModel | null
  phase: string
}>(() => ({ pending: null, phase: "" }))

async function selectModel(model: LocalSpeechModel) {
  useSettingsStore.getState().setLocalSpeechModel(model)
  try {
    await saveSettingsNow()
  } catch (error) {
    toast.error("Could not save the speech model selection", {
      description: String(error),
    })
  }
}

async function downloadModel(model: LocalSpeechModel) {
  if (useDownload.getState().pending) return
  useDownload.setState({ pending: model, phase: "Starting download…" })
  const progress = new Channel<string>()
  progress.onmessage = (phase) => {
    if (useDownload.getState().pending === model) {
      useDownload.setState({ phase })
    }
  }
  try {
    await invoke("download_local_speech_model", { model, progress })
    await selectModel(model)
    toast.success(`${MODELS[model].name} is ready for offline use`)
  } catch (error) {
    if (String(error) === "Model download canceled.") return
    toast.error("Could not download the speech model", {
      description: String(error),
    })
  } finally {
    useDownload.setState({ pending: null, phase: "" })
  }
}

export function useLocalSpeechModels() {
  const pending = useDownload((state) => state.pending)
  const phase = useDownload((state) => state.phase)
  const filePercent = phase.match(/(\d+)%$/)?.[1]
  const [models, setModels] = useState<LocalSpeechModelStatus[]>([])
  const [error, setError] = useState<string>()
  const [deleting, setDeleting] = useState(false)
  const [modelListRevision, setModelListRevision] = useState(0)

  async function deleteModel(model: LocalSpeechModel) {
    setDeleting(true)
    try {
      await invoke("delete_local_speech_model", { model })
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
    void invoke("list_local_speech_models")
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
  }, [pending, modelListRevision])

  const rows = models.map(({ model, installed, unavailableReason }) => {
    const { name, detail } = MODELS[model]
    return {
      model,
      installed,
      row: (
        <div
          key={model}
          className="flex flex-wrap items-center gap-3 px-3 py-2.5 has-data-[state=checked]:bg-primary/5"
        >
          {installed && !unavailableReason ? (
            <RadioGroupItem
              value={model}
              aria-label={`Use ${name}`}
              disabled={pending !== null || deleting}
            />
          ) : (
            <span className="size-4 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
          {unavailableReason && (
            <span className="text-xs text-muted-foreground">
              {unavailableReason}
            </span>
          )}
          {!installed && !unavailableReason && (
            <ModelDownloadButton
              name={name}
              kind="local-speech"
              disabled={pending !== null || deleting}
              onDownload={() => void downloadModel(model)}
              progress={
                pending === model
                  ? {
                      status: phase,
                      percent:
                        filePercent === undefined
                          ? undefined
                          : Number(filePercent),
                    }
                  : undefined
              }
            />
          )}
          {installed && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending !== null || deleting}
              aria-label={`Delete ${name}`}
              onClick={() => void deleteModel(model)}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    }
  })

  return { rows, error, loading: !error && models.length === 0 }
}
