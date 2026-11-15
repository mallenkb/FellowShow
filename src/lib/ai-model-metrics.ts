export interface AiModelPricing {
  inputPerMillion: number
  outputPerMillion: number
  requestUsd?: number
}

export interface AiModelBenchmark {
  tokensPerSecond: number
  intelligence?: number
  mode: string
}

// Standard short-context rates, checked against OpenAI's pricing on 2026-11-15.
// The OpenAI models endpoint does not include prices.
const openAiRates: Record<string, AiModelPricing> = {
  "gpt-6-luna": { inputPerMillion: 0.1, outputPerMillion: 0.5 },
  "gpt-5.6-luna": { inputPerMillion: 0.2, outputPerMillion: 1.2 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-6.1-terra": { inputPerMillion: 1, outputPerMillion: 5 },
  "gpt-6.1-sol": { inputPerMillion: 2, outputPerMillion: 10 },
  "gpt-6-astra": { inputPerMillion: 10, outputPerMillion: 50 },
  "gpt-5-nano": { inputPerMillion: 0.05, outputPerMillion: 0.4 },
  "gpt-5.4-nano": { inputPerMillion: 0.2, outputPerMillion: 1.25 },
}

// Artificial Analysis snapshots. A benchmark mode may differ from the mode
// selected by the provider for FellowShow requests.
const benchmarks: Record<string, AiModelBenchmark> = {
  "openai/gpt-6-luna": {
    tokensPerSecond: 89,
    intelligence: 10,
    mode: "Low reasoning",
  },
  "openai/gpt-6.1-terra": {
    tokensPerSecond: 65,
    intelligence: 42,
    mode: "High reasoning",
  },
  "openai/gpt-6.1-sol": {
    tokensPerSecond: 49,
    intelligence: 50,
    mode: "High reasoning",
  },
  "openai/gpt-4.1-mini": { tokensPerSecond: 90, mode: "Non-reasoning" },
  "google/gemma-4-26b-a4b-it": { tokensPerSecond: 70, mode: "Non-reasoning" },
  "google/gemma-4-31b-it": { tokensPerSecond: 58, mode: "Non-reasoning" },
  "nvidia/nemotron-3.5-lightning": {
    tokensPerSecond: 269,
    intelligence: 6,
    mode: "Reasoning",
  },
  "nvidia/nemotron-3.5-super-vl": {
    tokensPerSecond: 226,
    intelligence: 14,
    mode: "Reasoning",
  },
  "nvidia/nemotron-3-ultra-550b-a55b": {
    tokensPerSecond: 199,
    intelligence: 12,
    mode: "Reasoning",
  },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": {
    tokensPerSecond: 174,
    mode: "Reasoning",
  },
}

export const OPENAI_SUMMARY_COST_LIMIT = 0.01

export function openAiModelPricing(id: string): AiModelPricing | undefined {
  return Object.hasOwn(openAiRates, id) ? openAiRates[id] : undefined
}

export function modelBenchmark(id: string): AiModelBenchmark | undefined {
  const baseId = id.replace(/:free$/, "")
  const key = baseId.includes("/") ? baseId : `openai/${baseId}`
  return Object.hasOwn(benchmarks, key) ? benchmarks[key] : undefined
}

export function exampleSummaryCost(
  pricing?: AiModelPricing
): number | undefined {
  if (!pricing) return undefined
  return (
    pricing.inputPerMillion * 0.01 +
    pricing.outputPerMillion * 0.001 +
    (pricing.requestUsd ?? 0)
  )
}

export function formatModelPrice(
  value: number,
  maximumFractionDigits = 4
): string {
  if (value > 0 && value < 10 ** -maximumFractionDigits) {
    return `<${formatModelPrice(10 ** -maximumFractionDigits, maximumFractionDigits)}`
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  })
}
