const snapshotSuffix = /-(20\d{2})-?(\d{2})-?(\d{2})(?=:|$)/
const specialty =
  /(?:^|[-/])(?:realtime|audio|voice|tts|speech|transcribe|transcription|translate|translation|image|vision-preview|embedding|moderation|rerank|decisions|computer-use|search|codex)(?:[-:/]|$)/i
const openAiText =
  /^(?:gpt-\d+(?:\.\d+)*o?(?:-|$)|o\d+(?:-|$)|chat-latest$|ft:gpt-\d)/

export function isOpenAiSummaryModel(id: string): boolean {
  return openAiText.test(id) && !specialty.test(id)
}

interface ModelRelease {
  family: string
  version: number[]
  edition: number
  snapshot: string
}

function describeRelease(id: string): ModelRelease {
  const snapshot = id.match(snapshotSuffix)?.slice(1).join("") ?? ""
  const [base, route = "standard"] = id.replace(snapshotSuffix, "").split(":")
  const namedBase = base.replace(/^(openai\/)?gpt-5\.6$/, "$1gpt-5.6-sol")
  const named = namedBase.match(
    /^(?:openai\/)?gpt-(\d+(?:\.\d+)*)-(astra|sol|terra|luna)(-pro|-chat-latest)?$/
  )
  if (named) {
    const [, version, name, edition] = named
    return {
      family: `openai/${name}:${route}`,
      version: version.split(".").map(Number),
      edition:
        edition === undefined
          ? base === namedBase
            ? 3
            : 2
          : edition === "-pro"
            ? 1
            : 0,
      snapshot,
    }
  }

  const anthropic =
    base.match(/^anthropic\/claude-(opus|sonnet|haiku)-(\d+)(?:-(\d+))?$/) ??
    base.match(/^anthropic\/claude-(\d+)(?:[.-](\d+))?-(opus|sonnet|haiku)$/)
  if (anthropic) {
    const versionFirst = /^\d/.test(anthropic[1])
    const [name, major, minor] = versionFirst
      ? [anthropic[3], anthropic[1], anthropic[2]]
      : anthropic.slice(1)
    return {
      family: `anthropic/claude-${name}:${route}`,
      version: [Number(major), Number(minor ?? 0)],
      edition: 2,
      snapshot,
    }
  }

  const normalized = base.replace(/^(openai\/)?gpt-4o(?=-|$)/, "$1gpt-4.0")
  // Group versions only with the same remaining model name, size and tier.
  // Unknown naming schemes keep their full ID as the family.
  const numbered =
    normalized.match(
      /^((?:(?:openai\/)?gpt|google\/(?:gemini|gemma)|x-ai\/grok|deepseek\/deepseek|nvidia\/nemotron|mistralai\/mistral-(?:small|medium|large)))-v?(\d+(?:\.\d+)*)(?=-|$)(.*)$/
    ) ?? normalized.match(/^(qwen\/qwen)(\d+(?:\.\d+)*)(?=-|$)(.*)$/)
  if (numbered) {
    const [, family, version, variant] = numbered
    const stableVariant = variant.replace(/-preview$/, "")
    return {
      family: `${family}${stableVariant}:${route}`,
      version: version.split(".").map(Number),
      edition: stableVariant === variant ? 2 : 1,
      snapshot,
    }
  }

  return {
    family: id.replace(snapshotSuffix, ""),
    version: [],
    edition: 0,
    snapshot,
  }
}

function compareReleases(candidate: ModelRelease, current: ModelRelease) {
  for (
    let i = 0;
    i < Math.max(candidate.version.length, current.version.length);
    i++
  ) {
    const difference = (candidate.version[i] ?? 0) - (current.version[i] ?? 0)
    if (difference !== 0) return difference
  }
  return (
    candidate.edition - current.edition ||
    Number(!candidate.snapshot) - Number(!current.snapshot) ||
    candidate.snapshot.localeCompare(current.snapshot)
  )
}

export function currentAiModels<T extends { id: string }>(
  models: Iterable<T>
): T[] {
  const current = new Map<string, { model: T; release: ModelRelease }>()
  for (const model of models) {
    // Batch variants cannot run in the interactive summary flow.
    if (model.id.endsWith(":batch")) continue
    if (model.id.startsWith("openai/") && specialty.test(model.id)) continue
    const release = describeRelease(model.id)
    const previous = current.get(release.family)
    if (!previous || compareReleases(release, previous.release) > 0) {
      current.set(release.family, { model, release })
    }
  }
  return [...current.values()].map(({ model }) => model)
}
