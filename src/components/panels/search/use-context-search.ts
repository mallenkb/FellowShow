import { useEffect, useRef, useState } from "react"
import { mergeScriptureMatches, searchScripture } from "@/lib/context-search"
import type { SemanticSearchResult } from "@/types/detection"

export function useContextSearch(
  query: string,
  translationId: number,
  active: boolean
) {
  const generation = useRef(0)
  const key = `${translationId}:${query}`
  const [state, setState] = useState<{
    key: string
    results: SemanticSearchResult[]
    loading: boolean
    error: string | null
  }>({ key: "", results: [], loading: false, error: null })
  useEffect(() => {
    const request = ++generation.current
    const isCurrent = () => request === generation.current
    if (!active || query.trim().length < 2 || translationId <= 0) return
    let phrases: SemanticSearchResult[] = []
    let meanings: SemanticSearchResult[] = []
    let phraseDone = false
    let meaningDone = false
    let phraseFailed = false
    let meaningFailed = false
    const publish = () => {
      if (!isCurrent()) return
      setState({
        key,
        results: mergeScriptureMatches(phrases, meanings),
        loading: !phraseDone || (phrases.length === 0 && !meaningDone),
        error:
          phraseFailed && meaningFailed
            ? "Scripture search is unavailable. Check that a Bible translation is downloaded."
            : meaningFailed
              ? "Meaning search is unavailable. Showing phrase and keyword matches."
              : null,
      })
    }
    const fastTimer = setTimeout(() => {
      void searchScripture(query, translationId, false, isCurrent)
        .then((results) => {
          phrases = results
        })
        .catch((error) => {
          phraseFailed = true
          console.warn("[scripture-search] Phrase search failed", error)
        })
        .finally(() => {
          phraseDone = true
          publish()
        })
    }, 40)
    const meaningTimer = setTimeout(() => {
      void searchScripture(query, translationId, true, isCurrent)
        .then((results) => {
          meanings = results
        })
        .catch((error) => {
          meaningFailed = true
          console.warn("[scripture-search] Semantic search unavailable", error)
        })
        .finally(() => {
          meaningDone = true
          publish()
        })
    }, 350)
    return () => {
      generation.current += 1
      clearTimeout(fastTimer)
      clearTimeout(meaningTimer)
    }
  }, [active, key, query, translationId])
  const valid = active && query.trim().length >= 2 && translationId > 0
  return {
    semanticResults: valid && state.key === key ? state.results : [],
    isContextSearching: valid && (state.key !== key || state.loading),
    contextSearchError: valid && state.key === key ? state.error : null,
  }
}
