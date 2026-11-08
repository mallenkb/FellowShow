import { Channel } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { create } from "zustand"
import { Button } from "@/components/ui/button"
import { invoke, type WhisperModel, type WhisperModelStatus } from "@/lib/ipc"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"

const MODEL_NAMES: Record<WhisperModel, string> = {
  "small.en": "Small English",
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

export function WhisperModels() {
  const selected = useSettingsStore((state) =>
    state.localSpeechModel ? null : state.whisperModel
  )
  const { model: downloading, received } = useModelDownload()
  const [models, setModels] = useState<WhisperModelStatus[]>([])
  const [error, setError] = useState<string>()

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
  }, [downloading])

  return (
    <section aria-label="Whisper models" className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Whisper models
      </h3>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : models.length === 0 ? (
        <p className="text-xs text-muted-foreground">Checking local models…</p>
      ) : (
        models.map(({ model, sizeBytes, installed }) => {
          const active = installed && model === selected
          const pending = downloading === model
          const percent = Math.min(
            100,
            Math.floor((received / sizeBytes) * 100)
          )
          return (
            <div
              key={model}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <p className="text-xs font-medium">{MODEL_NAMES[model]}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(sizeBytes / 1024 ** 2)} MiB · Q8_0
                  {model === "small.en" ? " · English only" : ""}
                </p>
              </div>
              {active ? (
                <span className="text-xs text-muted-foreground">Selected</span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={downloading !== null}
                  aria-label={
                    installed
                      ? `Use ${MODEL_NAMES[model]}`
                      : `Download and use ${MODEL_NAMES[model]}`
                  }
                  onClick={() =>
                    void (installed ? selectModel(model) : downloadModel(model))
                  }
                >
                  {pending
                    ? `Downloading ${percent}%`
                    : installed
                      ? "Use model"
                      : "Download and use"}
                </Button>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
