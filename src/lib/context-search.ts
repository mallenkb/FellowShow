import { invoke } from "@/lib/ipc"
import type { SemanticSearchResult } from "@/types/detection"

const cache = new Map<
  string,
  { results: SemanticSearchResult[]; expires: number }
>()
const pending = new Map<string, Promise<SemanticSearchResult[]>>()
let semanticPending: Promise<unknown> = Promise.resolve()

export function searchScripture(
  query: string,
  translationId: number,
  semantic = false,
  isCurrent: () => boolean = () => true
): Promise<SemanticSearchResult[]> {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 500)
  const key = `${semantic}:${translationId}:${normalized}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.results)
  const existing = pending.get(key)
  if (existing && !semantic) return existing
  const run = async () => {
    if (!isCurrent()) return []
    const results = await invoke(
      semantic ? "semantic_search" : "search_scripture_phrases",
      {
        query: normalized,
        translationId,
        limit: 15,
      }
    )
    if (cache.size >= 100) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(key, { results, expires: Date.now() + 60_000 })
    return results
  }
  const promise = (semantic ? semanticPending.then(run) : run()).finally(() => {
    if (!semantic) pending.delete(key)
  })
  if (semantic) semanticPending = promise.catch(() => undefined)
  if (!semantic) pending.set(key, promise)
  return promise
}

export function mergeScriptureMatches(
  phrases: SemanticSearchResult[],
  semantic: SemanticSearchResult[]
): SemanticSearchResult[] {
  const seen = new Set<string>()
  return [...phrases, ...semantic]
    .filter((result) => {
      const key = `${result.book_number}:${result.chapter}:${result.verse}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 20)
}
