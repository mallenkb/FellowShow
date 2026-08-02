import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  type AiProvider,
  useSettingsStore,
} from "@/stores/settings-store"

const OPENROUTER_CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models"
const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses"
const OPENAI_MODELS_ENDPOINT = "https://api.openai.com/v1/models"
const MAX_TRANSIENT_RETRIES = 2
const MAX_AUTOMATIC_RETRY_DELAY_MS = 10_000

interface AiProviderConfig {
  provider: AiProvider
  apiKey: string | null
  model: string
}

interface AiMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AiRequestOptions {
  messages: AiMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface AiModelOption {
  id: string
  name: string | null
}

export interface AiProviderConfigOverrides {
  provider?: AiProvider
  apiKey?: string | null
  model?: string
}

class AiProviderNotConfiguredError extends Error {
  constructor(provider: AiProvider) {
    super(`${getAiProviderName(provider)} is not configured`)
    this.name = "AiProviderNotConfiguredError"
  }
}

class AiProviderRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AiProviderRequestError"
  }
}

interface ProviderErrorDetails {
  code: string | null
  type: string | null
  message: string | null
}

export function getAiProviderName(provider: AiProvider): string {
  return provider === "openai" ? "OpenAI" : "OpenRouter"
}

function getAiProviderConfig(
  overrides: AiProviderConfigOverrides = {}
): AiProviderConfig {
  const state = useSettingsStore.getState()
  const provider = overrides.provider ?? state.aiProvider
  const storedApiKey =
    provider === "openai" ? state.sermonOpenAiApiKey : state.openRouterApiKey
  const storedModel =
    provider === "openai" ? state.sermonOpenAiModel : state.openRouterModel
  const defaultModel =
    provider === "openai" ? DEFAULT_OPENAI_MODEL : DEFAULT_OPENROUTER_MODEL

  return {
    provider,
    apiKey:
      overrides.apiKey === undefined
        ? storedApiKey?.trim() || null
        : overrides.apiKey?.trim() || null,
    model: overrides.model?.trim() || storedModel.trim() || defaultModel,
  }
}

export function isAiProviderConfigured(): boolean {
  return Boolean(getAiProviderConfig().apiKey)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function readProviderErrorDetails(
  response: Response
): Promise<ProviderErrorDetails> {
  const payload = asRecord(await response.json().catch(() => null))
  const error = asRecord(payload?.error) ?? payload
  return {
    code: asTrimmedString(error?.code),
    type: asTrimmedString(error?.type),
    message: asTrimmedString(error?.message),
  }
}

function openAiLimitMessage(details: ProviderErrorDetails): string | null {
  const fingerprint = [details.code, details.type, details.message]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase()

  if (
    fingerprint.includes("credit_balance_exhausted") ||
    fingerprint.includes("insufficient_quota") ||
    fingerprint.includes("no prepaid credits")
  ) {
    return "OpenAI API credits are exhausted. Add credits or select OpenRouter in Settings → AI Model."
  }
  if (
    fingerprint.includes("organization_spend_limit_exceeded") ||
    fingerprint.includes("organization spend limit")
  ) {
    return "The OpenAI organization spend limit was reached. Increase it or select OpenRouter in Settings → AI Model."
  }
  if (
    fingerprint.includes("project_spend_limit_exceeded") ||
    fingerprint.includes("project spend limit")
  ) {
    return "The OpenAI project spend limit was reached. Increase it or select OpenRouter in Settings → AI Model."
  }
  if (
    fingerprint.includes("organization_usage_limit_exceeded") ||
    fingerprint.includes("organization usage limit")
  ) {
    return "The OpenAI organization usage limit was reached. Request a higher limit or select OpenRouter in Settings → AI Model."
  }
  return null
}

function retryAfterMilliseconds(response: Response): number | null {
  const value = response.headers.get("Retry-After")?.trim()
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000
  const retryAt = Date.parse(value)
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : null
}

async function waitForRetry(
  delayMs: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    const error = new Error("Request aborted")
    error.name = "AbortError"
    throw error
  }

  await new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId)
      const error = new Error("Request aborted")
      error.name = "AbortError"
      reject(error)
    }
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort)
      resolve()
    }, delayMs)
    signal?.addEventListener("abort", handleAbort, { once: true })
  })
}

function extractChatCompletionText(value: unknown): string {
  const choices = asRecord(value)?.choices
  if (!Array.isArray(choices) || choices.length === 0) return ""
  const content = asRecord(asRecord(choices[0])?.message)?.content
  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""

  return content
    .map((part) => {
      const text = asRecord(part)?.text
      return typeof text === "string" ? text.trim() : ""
    })
    .filter(Boolean)
    .join("\n")
    .trim()
}

function extractOpenAiResponseText(value: unknown): string {
  const response = asRecord(value)
  if (!response) return ""
  if (typeof response.output_text === "string") {
    return response.output_text.trim()
  }
  if (!Array.isArray(response.output)) return ""

  const textParts: string[] = []
  for (const outputItem of response.output) {
    const content = asRecord(outputItem)?.content
    if (!Array.isArray(content)) continue
    for (const contentItem of content) {
      const text = asRecord(contentItem)?.text
      if (typeof text === "string" && text.trim()) {
        textParts.push(text.trim())
      }
    }
  }
  return textParts.join("\n").trim()
}

function requestErrorForStatus(
  provider: AiProvider,
  status: number,
  requestKind: "generation" | "models",
  details: ProviderErrorDetails,
  retryAfterMs: number | null = null
): AiProviderRequestError {
  const providerName = getAiProviderName(provider)
  if (status === 401 || status === 403) {
    return new AiProviderRequestError(
      `The ${providerName} API key was rejected`
    )
  }
  if (status === 429) {
    const openAiMessage =
      provider === "openai" ? openAiLimitMessage(details) : null
    if (openAiMessage) return new AiProviderRequestError(openAiMessage)
    const retryGuidance =
      retryAfterMs !== null && retryAfterMs > 0
        ? ` Try again in about ${Math.max(1, Math.ceil(retryAfterMs / 1_000))} seconds.`
        : " Wait a moment and try again."
    return new AiProviderRequestError(
      requestKind === "models"
        ? `${providerName} temporarily limited the model list request.${retryGuidance}`
        : `${providerName} is temporarily limiting AI requests.${retryGuidance}`
    )
  }
  if (requestKind === "generation" && (status === 400 || status === 404)) {
    return new AiProviderRequestError(
      `The selected ${providerName} model is unavailable or incompatible`
    )
  }
  return new AiProviderRequestError(
    requestKind === "models"
      ? `Could not load ${providerName} models`
      : `The ${providerName} model request failed`
  )
}

async function requestOpenRouterText(
  config: AiProviderConfig,
  options: AiRequestOptions
): Promise<string> {
  let response: Response
  try {
    response = await fetch(OPENROUTER_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/mallenkb/FellowShow",
        "X-Title": "FellowShow",
      },
      body: JSON.stringify({
        model: config.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 800,
      }),
      signal: options.signal,
    })
  } catch {
    throw new AiProviderRequestError("Could not reach OpenRouter")
  }

  if (!response.ok) {
    const details = await readProviderErrorDetails(response)
    throw requestErrorForStatus(
      "openrouter",
      response.status,
      "generation",
      details,
      retryAfterMilliseconds(response)
    )
  }
  const content = extractChatCompletionText(
    await response.json().catch(() => null)
  )
  if (!content)
    throw new AiProviderRequestError("The AI model returned no text")
  return content
}

async function requestOpenAiText(
  config: AiProviderConfig,
  options: AiRequestOptions
): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model,
    input: options.messages.map((message) => ({
      role: message.role === "system" ? "developer" : message.role,
      content: message.content,
    })),
    max_output_tokens: options.maxTokens ?? 800,
    store: false,
  }

  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    let response: Response
    try {
      response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })
    } catch {
      throw new AiProviderRequestError("Could not reach OpenAI")
    }

    if (response.ok) {
      const content = extractOpenAiResponseText(
        await response.json().catch(() => null)
      )
      if (!content) {
        throw new AiProviderRequestError("The AI model returned no text")
      }
      return content
    }

    const retryAfterMs = retryAfterMilliseconds(response)
    const details = await readProviderErrorDetails(response)
    const terminalLimitMessage =
      response.status === 429 ? openAiLimitMessage(details) : null
    if (terminalLimitMessage) {
      throw new AiProviderRequestError(terminalLimitMessage)
    }

    const isTransient =
      response.status === 429 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504
    const fallbackDelayMs = 750 * 2 ** attempt
    const delayMs = retryAfterMs ?? fallbackDelayMs
    if (
      isTransient &&
      attempt < MAX_TRANSIENT_RETRIES &&
      delayMs <= MAX_AUTOMATIC_RETRY_DELAY_MS
    ) {
      await waitForRetry(delayMs, options.signal)
      continue
    }

    throw requestErrorForStatus(
      "openai",
      response.status,
      "generation",
      details,
      retryAfterMs
    )
  }

  throw new AiProviderRequestError("The OpenAI model request failed")
}

async function requestAiTextWithConfig(
  config: AiProviderConfig,
  options: AiRequestOptions
): Promise<string> {
  if (!config.apiKey) {
    throw new AiProviderNotConfiguredError(config.provider)
  }
  return config.provider === "openai"
    ? requestOpenAiText(config, options)
    : requestOpenRouterText(config, options)
}

async function requestAiText(options: AiRequestOptions): Promise<string> {
  return requestAiTextWithConfig(getAiProviderConfig(), options)
}

export async function testAiProviderConnection(
  overrides: AiProviderConfigOverrides,
  signal?: AbortSignal
): Promise<void> {
  await requestAiTextWithConfig(getAiProviderConfig(overrides), {
    messages: [
      {
        role: "user",
        content: "Reply with the single word OK to confirm this connection.",
      },
    ],
    maxTokens: 128,
    signal,
  })
}

function parseModelOptions(
  provider: AiProvider,
  value: unknown
): AiModelOption[] | null {
  const data = asRecord(value)?.data
  if (!Array.isArray(data)) return null

  const byId = new Map<string, AiModelOption>()
  for (const item of data) {
    const record = asRecord(item)
    const id = typeof record?.id === "string" ? record.id.trim() : ""
    if (!id) continue
    const rawName = provider === "openrouter" ? record?.name : null
    const name =
      typeof rawName === "string" && rawName.trim() && rawName.trim() !== id
        ? rawName.trim()
        : null
    byId.set(id, { id, name })
  }

  return [...byId.values()].sort((left, right) =>
    (left.name ?? left.id).localeCompare(right.name ?? right.id)
  )
}

export async function fetchAiProviderModels(
  overrides: AiProviderConfigOverrides,
  signal?: AbortSignal
): Promise<AiModelOption[]> {
  const config = getAiProviderConfig(overrides)
  if (!config.apiKey) {
    throw new AiProviderNotConfiguredError(config.provider)
  }
  const endpoint =
    config.provider === "openai"
      ? OPENAI_MODELS_ENDPOINT
      : OPENROUTER_MODELS_ENDPOINT
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
  }
  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/mallenkb/FellowShow"
    headers["X-Title"] = "FellowShow"
  }

  let response: Response
  try {
    response = await fetch(endpoint, { headers, signal })
  } catch {
    throw new AiProviderRequestError(
      `Could not reach ${getAiProviderName(config.provider)}`
    )
  }
  if (!response.ok) {
    const details = await readProviderErrorDetails(response)
    throw requestErrorForStatus(
      config.provider,
      response.status,
      "models",
      details,
      retryAfterMilliseconds(response)
    )
  }

  const models = parseModelOptions(
    config.provider,
    await response.json().catch(() => null)
  )
  if (!models) {
    throw new AiProviderRequestError(
      `${getAiProviderName(config.provider)} returned an invalid model list`
    )
  }
  return models
}

export async function requestAiJson<T>(
  options: AiRequestOptions,
  parse: (value: unknown) => T | null
): Promise<T> {
  const content = await requestAiText({
    ...options,
    messages: [
      {
        role: "system",
        content:
          "Return only valid JSON. Do not wrap it in Markdown fences or add commentary.",
      },
      ...options.messages,
    ],
  })
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new AiProviderRequestError("The AI model returned invalid JSON")
  }
  const result = parse(parsed)
  if (result === null) {
    throw new AiProviderRequestError("The AI model returned an invalid result")
  }
  return result
}
