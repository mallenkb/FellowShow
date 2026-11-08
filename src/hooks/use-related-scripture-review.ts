import { useCallback, useEffect, useMemo, useState } from "react"
import {
  reviewRelatedScriptures,
  toReviewCandidate,
  type ScriptureReviewCandidate,
} from "@/lib/related-scripture-decisions"
import { useDetectionStore } from "@/stores/detection-store"
import { unlockSecureSettings, useSettingsStore } from "@/stores/settings-store"
import type { DetectionResult } from "@/types"
import type { ScriptureDecisionType } from "@/types/detection"

const REVIEW_DELAY_MS = 350
const REQUEST_TIMEOUT_MS = 12_000
const REVIEW_BATCH_SIZE = 20
export const MIN_RELATED_SCORE_PERCENT = 90
const RECENT_RELATED_LIMIT = 30

export interface RelatedScriptureMatch {
  detection: DetectionResult
  matchType: Exclude<ScriptureDecisionType, "unrelated" | "uncertain"> | "local"
  score: number
}

export type RelatedScriptureReviewStatus =
  "off" | "checking" | "ready" | "missing-key" | "error"

interface ReviewError {
  fingerprint: string
  message: string
}

interface ReviewRequest {
  sessionId: string | null
  candidates: ScriptureReviewCandidate[]
}

export function useRelatedScriptureReview({
  sessionId,
  candidates,
  isActive,
}: {
  sessionId: string | null
  candidates: DetectionResult[]
  isActive: boolean
}): {
  matches: RelatedScriptureMatch[]
  status: RelatedScriptureReviewStatus
  error?: string
  retry: () => void
} {
  const enabled = useSettingsStore((state) => state.relatedScriptureAiEnabled)
  const unlocked = useSettingsStore((state) => state.secretsUnlocked)
  const apiKey = useSettingsStore(
    (state) => state.decisionsApiKey?.trim() ?? ""
  )
  const [reviewError, setReviewError] = useState<ReviewError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const retry = useCallback(() => setRetryCount((count) => count + 1), [])
  // A stable batch is not restarted just because new transcript lines arrive.
  const fingerprint = useMemo(
    () =>
      JSON.stringify({
        sessionId,
        retryCount,
        candidates: candidates
          .filter((candidate) => !candidate.review)
          .slice(0, REVIEW_BATCH_SIZE)
          .map(toReviewCandidate),
      }),
    [sessionId, retryCount, candidates]
  )
  const request = useMemo(
    () => JSON.parse(fingerprint) as ReviewRequest,
    [fingerprint]
  )

  useEffect(() => {
    if (
      !enabled ||
      !isActive ||
      !request.sessionId ||
      !request.candidates.length
    )
      return
    let cancelled = false
    if (!unlocked) {
      void unlockSecureSettings().catch(() => {
        if (!cancelled)
          setReviewError({
            fingerprint,
            message:
              "Could not unlock saved API keys. Open AI Model settings to try again.",
          })
      })
      return () => {
        cancelled = true
      }
    }
    if (!apiKey) return

    const controller = new AbortController()
    let requestTimeout: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    const timer = setTimeout(() => {
      requestTimeout = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, REQUEST_TIMEOUT_MS)
      void reviewRelatedScriptures(
        apiKey,
        request.candidates,
        controller.signal
      )
        .then((reviews) => {
          if (cancelled || !request.sessionId) return
          const evidence = new Map(
            request.candidates.map((candidate) => [candidate.key, candidate])
          )
          useDetectionStore.getState().applyReviews(
            request.sessionId,
            reviews.flatMap((review) => {
              const candidate = evidence.get(review.key)
              return candidate
                ? [
                    {
                      key: review.key,
                      text: candidate.text,
                      heard: candidate.heard,
                      review: {
                        type: review.type,
                        relevance: review.relevance,
                      },
                    },
                  ]
                : []
            })
          )
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setReviewError({
            fingerprint,
            message: timedOut
              ? "OpenAI scripture matching timed out."
              : error instanceof TypeError
                ? "Could not reach OpenAI for scripture matching."
                : error instanceof Error
                  ? error.message
                  : "Could not review related scriptures.",
          })
        })
        .finally(() => {
          if (requestTimeout) clearTimeout(requestTimeout)
        })
    }, REVIEW_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (requestTimeout) clearTimeout(requestTimeout)
      controller.abort()
    }
  }, [enabled, isActive, request, fingerprint, unlocked, apiKey])

  const currentError =
    reviewError?.fingerprint === fingerprint ? reviewError.message : undefined
  const localOnly = !enabled || !unlocked || !apiKey || Boolean(currentError)
  const status: RelatedScriptureReviewStatus = !enabled
    ? "off"
    : currentError
      ? "error"
      : unlocked && !apiKey
        ? "missing-key"
        : isActive && request.candidates.length
          ? "checking"
          : "ready"
  const matches = useMemo(() => {
    return candidates
      .flatMap<RelatedScriptureMatch & { index: number }>(
        (detection, index) => {
          const review = detection.review
          if (localOnly || !review) {
            return [
              {
                detection,
                matchType: "local",
                score: Number.isFinite(detection.confidence)
                  ? detection.confidence
                  : 0,
                index,
              },
            ]
          }
          if (
            review.type === "unrelated" ||
            review.type === "uncertain" ||
            !Number.isFinite(review.relevance) ||
            review.relevance < MIN_RELATED_SCORE_PERCENT / 100
          )
            return []
          return [
            {
              detection,
              matchType: review.type,
              score: Math.min(1, review.relevance),
              index,
            },
          ]
        }
      )
      .slice(-RECENT_RELATED_LIMIT)
      .sort(
        (left, right) =>
          Number(left.matchType === "local") -
            Number(right.matchType === "local") ||
          right.score - left.score ||
          right.index - left.index
      )
      .map(({ detection, matchType, score }) => ({
        detection,
        matchType,
        score,
      }))
  }, [candidates, localOnly])

  return { matches, status, error: currentError, retry }
}
