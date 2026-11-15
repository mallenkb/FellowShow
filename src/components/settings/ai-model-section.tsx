import { useCallback, useEffect, useRef, useState } from "react"
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  AiModelCatalogPicker,
  type AiModelCatalogState,
} from "@/components/settings/ai-model-catalog-picker"
import { AiProviderSelector } from "@/components/settings/ai-provider-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SavedKeysStatus } from "./saved-keys-status"
import {
  fetchAiProviderModels,
  getAiProviderName,
  testAiProviderConnection,
  type AiModelOption,
} from "@/lib/ai-provider"
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  saveSettingsNow,
  type AiProvider,
  useSettingsStore,
} from "@/stores/settings-store"

type RequestState = "idle" | "loading" | "success" | "error"

export function AiModelSection({ isActive = true }: { isActive?: boolean }) {
  const secretsUnlocked = useSettingsStore((state) => state.secretsUnlocked)
  const provider = useSettingsStore((state) => state.aiProvider)
  const configuredOpenRouterKey = useSettingsStore(
    (state) => state.openRouterApiKey
  )
  const configuredOpenRouterModel = useSettingsStore(
    (state) => state.openRouterModel
  )
  const configuredOpenAiKey = useSettingsStore(
    (state) => state.sermonOpenAiApiKey
  )
  const configuredOpenAiModel = useSettingsStore(
    (state) => state.sermonOpenAiModel
  )
  const setConfiguredProvider = useSettingsStore((state) => state.setAiProvider)
  const setConfiguredOpenRouterKey = useSettingsStore(
    (state) => state.setOpenRouterApiKey
  )
  const setConfiguredOpenRouterModel = useSettingsStore(
    (state) => state.setOpenRouterModel
  )
  const setConfiguredOpenAiKey = useSettingsStore(
    (state) => state.setSermonOpenAiApiKey
  )
  const setConfiguredOpenAiModel = useSettingsStore(
    (state) => state.setSermonOpenAiModel
  )

  const [openRouterKeyDraft, setOpenRouterKeyDraft] = useState<string | null>(
    null
  )
  const [openRouterModel, setOpenRouterModel] = useState(
    configuredOpenRouterModel
  )
  const [openAiKeyDraft, setOpenAiKeyDraft] = useState<string | null>(null)
  const [openAiModel, setOpenAiModel] = useState(configuredOpenAiModel)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [connectionState, setConnectionState] = useState<RequestState>("idle")
  const [connectionMessage, setConnectionMessage] = useState("")
  const [modelListState, setModelListState] =
    useState<AiModelCatalogState>("idle")
  const [modelListMessage, setModelListMessage] = useState("")
  const [availableModels, setAvailableModels] = useState<AiModelOption[]>([])
  const catalogRequest = useRef<AbortController | null>(null)

  useEffect(
    () => setOpenRouterModel(configuredOpenRouterModel),
    [configuredOpenRouterModel]
  )
  useEffect(
    () => setOpenAiModel(configuredOpenAiModel),
    [configuredOpenAiModel]
  )

  useEffect(() => {
    setShowApiKey(false)
    setConnectionState("idle")
    setConnectionMessage("")
    setModelListState("idle")
    setModelListMessage("")
    setAvailableModels([])
  }, [provider])

  const configuredKey =
    provider === "openai" ? configuredOpenAiKey : configuredOpenRouterKey
  const keyDraft = provider === "openai" ? openAiKeyDraft : openRouterKeyDraft
  const apiKey = keyDraft ?? configuredKey ?? ""
  const model = provider === "openai" ? openAiModel : openRouterModel
  const defaultModel =
    provider === "openai" ? DEFAULT_OPENAI_MODEL : DEFAULT_OPENROUTER_MODEL
  const providerName = getAiProviderName(provider)

  const updateApiKey = (value: string) => {
    catalogRequest.current?.abort()
    catalogRequest.current = null
    if (provider === "openai") setOpenAiKeyDraft(value)
    else setOpenRouterKeyDraft(value)
    setAvailableModels([])
    setModelListState("idle")
    setModelListMessage("")
  }

  const updateModel = (value: string) => {
    if (provider === "openai") setOpenAiModel(value)
    else setOpenRouterModel(value)
  }

  const changeProvider = async (nextProvider: AiProvider) => {
    setConfiguredProvider(nextProvider)
    setSaved(false)
    try {
      await saveSettingsNow()
    } catch {
      toast.error("Could not save the summary provider")
    }
  }

  const save = async () => {
    if (secretsUnlocked && openRouterKeyDraft !== null)
      setConfiguredOpenRouterKey(openRouterKeyDraft.trim() || null)
    setConfiguredOpenRouterModel(
      openRouterModel.trim() || DEFAULT_OPENROUTER_MODEL
    )
    if (secretsUnlocked && openAiKeyDraft !== null)
      setConfiguredOpenAiKey(openAiKeyDraft.trim() || null)
    setConfiguredOpenAiModel(openAiModel.trim() || DEFAULT_OPENAI_MODEL)
    await saveSettingsNow()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2_000)
  }

  const testConnection = async () => {
    const trimmedKey = apiKey.trim()
    const trimmedModel = model.trim() || defaultModel
    if (!trimmedKey) {
      setConnectionState("error")
      setConnectionMessage(`Enter a ${providerName} API key before testing.`)
      return
    }

    setConnectionState("loading")
    setConnectionMessage("")
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000)
    try {
      await testAiProviderConnection(
        { provider, apiKey: trimmedKey, model: trimmedModel },
        controller.signal
      )
      if (useSettingsStore.getState().aiProvider !== provider) return
      setConnectionState("success")
      setConnectionMessage(`${providerName} connection successful.`)
    } catch (error) {
      if (useSettingsStore.getState().aiProvider !== provider) return
      setConnectionState("error")
      setConnectionMessage(
        controller.signal.aborted
          ? `${providerName} connection test timed out.`
          : error instanceof Error
            ? error.message
            : `Could not test the ${providerName} connection.`
      )
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const loadModels = useCallback(
    async (key: string) => {
      if (provider === "off") return
      const trimmedKey = key.trim()
      catalogRequest.current?.abort()
      catalogRequest.current = null
      if (!trimmedKey) {
        setModelListState("error")
        setModelListMessage(`Enter a ${providerName} API key to load models.`)
        return
      }

      setModelListState("loading")
      setModelListMessage("")
      const controller = new AbortController()
      catalogRequest.current = controller
      const timeoutId = window.setTimeout(() => controller.abort(), 20_000)
      try {
        const models = await fetchAiProviderModels(
          { provider, apiKey: trimmedKey },
          controller.signal
        )
        if (
          catalogRequest.current !== controller ||
          useSettingsStore.getState().aiProvider !== provider
        )
          return
        setAvailableModels(models)
        setModelListState("success")
        setModelListMessage(
          models.length > 0
            ? `${models.length} ${providerName} model${models.length === 1 ? "" : "s"} available.`
            : provider === "openai"
              ? "No budget summary models are available for this OpenAI account."
              : `${providerName} returned no models.`
        )
      } catch (error) {
        if (
          catalogRequest.current !== controller ||
          useSettingsStore.getState().aiProvider !== provider
        )
          return
        setAvailableModels([])
        setModelListState("error")
        setModelListMessage(
          controller.signal.aborted
            ? `${providerName} model loading timed out.`
            : error instanceof Error
              ? error.message
              : `Could not load ${providerName} models.`
        )
      } finally {
        window.clearTimeout(timeoutId)
        if (catalogRequest.current === controller) catalogRequest.current = null
      }
    },
    [provider, providerName]
  )

  useEffect(() => {
    if (isActive && provider !== "off" && configuredKey?.trim()) {
      void loadModels(configuredKey)
    }
    return () => {
      catalogRequest.current?.abort()
      catalogRequest.current = null
    }
  }, [configuredKey, isActive, loadModels, provider])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Choose the model FellowShow uses to turn a transcript into sermon notes.
      </p>

      <AiProviderSelector
        provider={provider}
        onChange={(nextProvider) => void changeProvider(nextProvider)}
      />
      {provider !== "off" && (
        <>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-[1_1_12rem]">
                <Input
                  type={showApiKey ? "text" : "password"}
                  disabled={!secretsUnlocked}
                  value={apiKey}
                  onChange={(event) => updateApiKey(event.target.value)}
                  aria-label={`${providerName} API key`}
                  placeholder={`Paste your ${providerName} API key`}
                  autoComplete="off"
                  className="pr-9 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={!secretsUnlocked}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={
                    showApiKey
                      ? `Hide ${providerName} API key`
                      : `Show ${providerName} API key`
                  }
                  title={showApiKey ? "Hide API key" : "Show API key"}
                  onClick={() => setShowApiKey((visible) => !visible)}
                >
                  {showApiKey ? (
                    <EyeOffIcon className="size-3.5" />
                  ) : (
                    <EyeIcon className="size-3.5" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={connectionState === "loading"}
                onClick={() => void testConnection()}
              >
                {connectionState === "loading" ? (
                  <>
                    <LoaderCircleIcon className="size-3 animate-spin" />{" "}
                    Testing…
                  </>
                ) : (
                  "Test connection"
                )}
              </Button>
            </div>
            {connectionMessage ? (
              <span
                className="inline-flex items-center gap-1"
                role="status"
                aria-live="polite"
              >
                <span
                  className={`text-[0.625rem] ${
                    connectionState === "success"
                      ? "text-emerald-700 dark:text-emerald-500"
                      : "text-destructive"
                  }`}
                >
                  {connectionMessage}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss connection status"
                  title="Dismiss status"
                  onClick={() => {
                    setConnectionMessage("")
                    setConnectionState("idle")
                  }}
                >
                  <XIcon className="size-3" />
                </Button>
              </span>
            ) : null}
            <span className="text-[0.625rem] leading-relaxed text-muted-foreground">
              {provider === "openai"
                ? "Stored separately from the OpenAI key used for the live transcript. Sent only to api.openai.com for sermon intelligence requests."
                : "Stored in FellowShow settings and sent only to OpenRouter for sermon intelligence requests."}{" "}
              FellowShow never writes the key to logs.
            </span>
            <SavedKeysStatus />
          </div>
          <hr className="border-border" />
          <AiModelCatalogPicker
            key={provider}
            providerName={providerName}
            model={model}
            models={availableModels}
            state={modelListState}
            message={modelListMessage}
            onSelect={updateModel}
            onLoad={() => void loadModels(apiKey)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() =>
                void save().catch(() =>
                  toast.error("Could not save summary settings")
                )
              }
            >
              {saved ? (
                <>
                  <CheckIcon className="size-3" /> Saved
                </>
              ) : (
                "Save summary settings"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
