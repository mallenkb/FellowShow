import { toast } from "sonner"
import { RadioGroup } from "@/components/ui/radio-group"
import { LOCAL_SPEECH_MODEL_IDS, WHISPER_MODEL_IDS } from "@/lib/ipc"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"
import { useLocalSpeechModels } from "./local-speech-models"
import { useWhisperModels } from "./whisper-models"

async function chooseLocalModel(value: string) {
  const local = LOCAL_SPEECH_MODEL_IDS.find((model) => model === value)
  const whisper = WHISPER_MODEL_IDS.find((model) => model === value)
  const settings = useSettingsStore.getState()
  if (local) settings.setLocalSpeechModel(local)
  else if (whisper) settings.setWhisperModel(whisper)
  else return

  try {
    await saveSettingsNow()
  } catch (error) {
    toast.error("Could not save the speech model selection", {
      description: String(error),
    })
  }
}

export function SpeechModelPicker() {
  const selected = useSettingsStore(
    (state) => state.localSpeechModel ?? state.whisperModel
  )
  const local = useLocalSpeechModels()
  const whisper = useWhisperModels()
  const models = [...local.rows, ...whisper.rows]
  const downloaded = models.filter((model) => model.installed)
  const available = models.filter((model) => !model.installed)
  const sections = [
    { name: "Available models", models: available },
    { name: "Downloaded models", models: downloaded },
  ]
  if (downloaded[0]?.model === "parakeet") sections.reverse()

  return (
    <div className="flex flex-col gap-2">
      {local.error && (
        <p role="alert" className="text-xs text-destructive">
          {local.error}
        </p>
      )}
      {whisper.error && (
        <p role="alert" className="text-xs text-destructive">
          {whisper.error}
        </p>
      )}
      {(local.loading || whisper.loading) && (
        <p className="text-xs text-muted-foreground">Checking local models…</p>
      )}
      {models.length > 0 && (
        <RadioGroup
          aria-label="Local transcription model"
          className="gap-0 overflow-hidden rounded-xl border"
          value={selected}
          onValueChange={(model) => void chooseLocalModel(model)}
        >
          {sections.map(({ name, models }) => (
            <div
              key={name}
              role="group"
              aria-label={name}
              className="border-b last:border-b-0"
            >
              <h3 className="px-3 pt-3 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {name}
              </h3>
              {models.length > 0 ? (
                models.map(({ row }) => row)
              ) : (
                <p className="px-3 pb-3 text-xs text-muted-foreground">None</p>
              )}
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  )
}
