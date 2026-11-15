import { useEffect, useRef, useState } from "react"
import { SparklesIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateSermonReviewSummary } from "@/lib/sermon-ai-summary"
import {
  type getSermonSummaryView,
  parseSummaryLayout,
  SUMMARY_LAYOUTS,
} from "@/lib/sermon-summary-layout"
import { useSermonStore } from "@/stores/sermon-store"
import type { SermonSession } from "@/types"

export function SessionSummary({
  session,
  summary,
}: {
  session: SermonSession
  summary: ReturnType<typeof getSermonSummaryView>
}) {
  const [generating, setGenerating] = useState(false)
  const request = useRef<AbortController | null>(null)
  const { title, layout, sections } = summary
  const hasTranscript =
    session.transcript.some((segment) => segment.trim()) ||
    session.transcriptSegments?.some(({ text }) => text.trim())

  useEffect(() => () => request.current?.abort(), [])

  async function generate() {
    if (request.current) return
    const segments = session.transcriptSegments?.map(({ text }) => text) ?? []
    const transcript = (
      segments.some((segment) => segment.trim()) ? segments : session.transcript
    )
      .join("\n")
      .trim()
    if (!transcript) return
    const controller = new AbortController()
    request.current = controller
    setGenerating(true)
    try {
      const generated = await generateSermonReviewSummary(
        transcript,
        controller.signal
      )
      if (!controller.signal.aborted) {
        useSermonStore.getState().setReviewSummary(session.id, generated)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error("Could not generate the sermon summary", {
          description: String(error),
        })
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={layout}
          onValueChange={(value) => {
            const selected = parseSummaryLayout(value)
            if (selected)
              useSermonStore.getState().setSummaryLayout(session.id, selected)
          }}
        >
          <SelectTrigger size="sm" aria-label="Summary layout">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {SUMMARY_LAYOUTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasTranscript ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generating}
            onClick={() => void generate()}
          >
            <SparklesIcon aria-hidden="true" />
            {generating
              ? "Generating…"
              : session.reviewSummary
                ? "Regenerate with AI"
                : "Generate with AI"}
          </Button>
        ) : null}
      </div>
      {sections.length ? (
        <article aria-label="Sermon summary" className="space-y-5 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {sections.map(({ key, label, value }) => {
            const List = key === "declarations" ? "ol" : "ul"
            return (
              <section key={key} className="space-y-1.5">
                <h3 className="font-medium">{label}</h3>
                {typeof value === "string" ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{value}</p>
                ) : key === "scriptures" ? (
                  <p className="leading-relaxed text-muted-foreground">
                    {value.join(", ")}
                  </p>
                ) : (
                  <List
                    className={
                      key === "declarations"
                        ? "list-decimal space-y-1 pl-5"
                        : "list-disc space-y-1 pl-5"
                    }
                  >
                    {value.map((line, index) => (
                      <li key={index} className="whitespace-pre-wrap">
                        {line}
                      </li>
                    ))}
                  </List>
                )}
              </section>
            )
          })}
        </article>
      ) : (
        <p className="text-muted-foreground">No sermon summary yet.</p>
      )}
    </div>
  )
}
