import { Channel } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { create } from "zustand"

import { Button } from "@/components/ui/button"
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
    detail: "Multilingual · Short segments · 671 MB",
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
    toast.error("Could not download the speech model", {
      description: String(error),
    })
  } finally {
    useDownload.setState({ pending: null, phase: "" })
  }
}

export function LocalSpeechModels() {
  const selected = useSettingsStore((state) => state.localSpeechModel)
  const pending = useDownload((state) => state.pending)
  const phase = useDownload((state) => state.phase)
  const [models, setModels] = useState<LocalSpeechModelStatus[]>([])
  const [error, setError] = useState<string>()

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
  }, [pending])

  return (
    <section
      aria-label="More local speech models"
      className="flex flex-col gap-2"
    >
      <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        More local speech models
      </h3>
      <p className="text-xs text-muted-foreground">
        The first download requires{" "}
        <button
          type="button"
          className="text-foreground underline underline-offset-2"
          onClick={() => {
            void openUrl(
              "https://docs.astral.sh/uv/getting-started/installation/"
            ).catch((failure: unknown) => {
              toast.error("Could not open the uv installation guide", {
                description: String(failure),
              })
            })
          }}
        >
          uv
        </button>{" "}
        and an internet connection. Sizes are for model files. Model changes
        apply the next time you start transcription.
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!error && models.length === 0 && (
        <p className="text-xs text-muted-foreground">Checking local models…</p>
      )}
      {models.map(({ model, installed, unavailableReason }) => {
        const { name, detail } = MODELS[model]
        return (
          <div
            key={model}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div>
              <p className="text-xs font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
            {unavailableReason || (installed && selected === model) ? (
              <span className="text-xs text-muted-foreground">
                {unavailableReason ?? "Selected"}
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending !== null}
                aria-label={
                  installed ? `Use ${name}` : `Download and use ${name}`
                }
                onClick={() =>
                  void (installed ? selectModel(model) : downloadModel(model))
                }
              >
                {pending === model
                  ? phase
                  : installed
                    ? "Use model"
                    : "Download and use"}
              </Button>
            )}
          </div>
        )
      })}
    </section>
  )
}
