import { useState } from "react"
import {
  CopyIcon,
  LoaderCircleIcon,
  NotebookTextIcon,
  SparklesIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { invoke } from "@/lib/ipc"
import { useTranscriptStore } from "@/stores/transcript-store"
import type { PreachingSummary } from "@/types"

function summaryAsText(summary: PreachingSummary): string {
  const sections = [
    "Preaching summary",
    "",
    summary.overview,
    "",
    "Key points",
    ...summary.key_points.map((point) => `- ${point}`),
  ]

  if (summary.scriptures.length > 0) {
    sections.push(
      "",
      "Highlighted scriptures",
      ...summary.scriptures.map((reference) => `- ${reference}`)
    )
  }

  return sections.join("\n")
}

export function PreachingSummaryPanel() {
  const segments = useTranscriptStore((state) => state.segments)
  const highlightedScriptures = useTranscriptStore(
    (state) => state.highlightedScriptures
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState<PreachingSummary | null>(null)

  const generateSummary = async () => {
    if (segments.length === 0) {
      toast.error("No transcript to summarize")
      return
    }

    setIsGenerating(true)
    try {
      const result = await invoke("summarize_preaching", {
        segments: segments.map((segment) => segment.text),
        scriptures: highlightedScriptures,
      })
      setSummary(result)
    } catch (error) {
      toast.error("Could not create preaching summary", {
        description: String(error),
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copySummary = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summaryAsText(summary))
      toast.success("Preaching summary copied")
    } catch (error) {
      toast.error("Could not copy summary", { description: String(error) })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[0.6875rem] text-muted-foreground">
          Based on the current transcript
        </p>
        <Button
          type="button"
          variant={summary ? "outline" : "secondary"}
          size="xs"
          disabled={segments.length === 0 || isGenerating}
          onClick={() => void generateSummary()}
        >
          {isGenerating ? (
            <LoaderCircleIcon className="size-3 animate-spin" />
          ) : (
            <SparklesIcon className="size-3" />
          )}
          {summary ? "Regenerate" : "Generate summary"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isGenerating && !summary ? (
          <div className="flex min-h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Creating summary…
          </div>
        ) : summary ? (
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Overview
              </h3>
              <p className="text-sm leading-relaxed text-foreground">
                {summary.overview}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Key points
              </h3>
              <ul className="space-y-2">
                {summary.key_points.map((point, index) => (
                  <li
                    key={`${index}-${point}`}
                    className="flex gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <span className="text-muted-foreground">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            {summary.scriptures.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Highlighted scriptures
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {summary.scriptures.map((reference) => (
                    <span
                      key={reference}
                      className="rounded-md border border-yellow-500/30 bg-yellow-300/15 px-2 py-1 text-xs font-medium text-foreground"
                    >
                      {reference}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex justify-end border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => void copySummary()}
              >
                <CopyIcon className="size-3" />
                Copy summary
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <NotebookTextIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Generate an overview, key points, and highlighted scriptures from
              the preaching transcript
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
