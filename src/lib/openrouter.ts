import { useSettingsStore } from "@/stores/settings-store"

export const DEFAULT_OPENROUTER_MODEL = "inclusionai/ling-3.0-flash:free"
export const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions"

export interface OpenRouterConfig {
  apiKey: string | null
  model: string
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface OpenRouterRequestOptions {
  messages: OpenRouterMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export class OpenRouterNotConfiguredError extends Error {
  constructor() {
    super("OpenRouter is not configured")
    this.name = "OpenRouterNotConfiguredError"
  }
}

export class OpenRouterRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OpenRouterRequestError"
  }
}

export function getOpenRouterConfig(): OpenRouterConfig {
  const state = useSettingsStore.getState()
  return {
    apiKey: state.openRouterApiKey?.trim() || null,
    model: state.openRouterModel.trim() || DEFAULT_OPENROUTER_MODEL,
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(getOpenRouterConfig().apiKey)
}

function extractContent(value: unknown): string {
  if (!value || typeof value !== "object") return ""
  const choices = (value as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return ""
  const firstChoice = choices[0]
  if (!firstChoice || typeof firstChoice !== "object") return ""
  const content = (firstChoice as { message?: { content?: unknown } }).message
    ?.content
  return typeof content === "string" ? content.trim() : ""
}

export async function requestOpenRouterText(
  options: OpenRouterRequestOptions
): Promise<string> {
  const config = getOpenRouterConfig()
  if (!config.apiKey) throw new OpenRouterNotConfiguredError()

  let response: Response
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
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
    throw new OpenRouterRequestError("Could not reach the configured AI model")
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterRequestError("The OpenRouter API key was rejected")
    }
    if (response.status === 429) {
      throw new OpenRouterRequestError("The configured AI model is rate limited")
    }
    throw new OpenRouterRequestError("The configured AI model request failed")
  }

  const content = extractContent(await response.json().catch(() => null))
  if (!content) throw new OpenRouterRequestError("The AI model returned no text")
  return content
}

export async function requestOpenRouterJson<T>(
  options: OpenRouterRequestOptions,
  parse: (value: unknown) => T | null
): Promise<T> {
  const content = await requestOpenRouterText({
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
    throw new OpenRouterRequestError("The AI model returned invalid JSON")
  }
  const result = parse(parsed)
  if (result === null) {
    throw new OpenRouterRequestError("The AI model returned an invalid result")
  }
  return result
}
