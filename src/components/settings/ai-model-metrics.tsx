import { BrainCircuitIcon, CoinsIcon, ZapIcon } from "lucide-react"
import {
  exampleSummaryCost,
  formatModelPrice,
  modelBenchmark,
} from "@/lib/ai-model-metrics"
import type { AiModelOption } from "@/lib/ai-provider"

export function AiModelMetrics({ model }: { model: AiModelOption }) {
  const benchmark = modelBenchmark(model.id)
  const cost = exampleSummaryCost(model.pricing)
  const price = model.pricing
  const speed = benchmark?.tokensPerSecond
  const speedLabel =
    speed === undefined
      ? null
      : speed >= 150
        ? "Very fast"
        : speed >= 80
          ? "Fast"
          : speed >= 45
            ? "Moderate"
            : "Slower"
  const bolts =
    speed === undefined
      ? 0
      : speed >= 150
        ? 4
        : speed >= 80
          ? 3
          : speed >= 45
            ? 2
            : 1

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-px overflow-hidden rounded-lg border bg-border text-xs">
      <div className="grid content-start gap-1 bg-background p-3">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CoinsIcon className="size-3.5" aria-hidden="true" /> Pricing
        </span>
        <span className="font-medium">
          {cost === undefined
            ? "Price unavailable"
            : cost === 0
              ? "Free"
              : `Est. ${formatModelPrice(cost)} per summary`}
        </span>
        {price && (
          <span className="text-muted-foreground">
            {formatModelPrice(price.inputPerMillion)} in ·{" "}
            {formatModelPrice(price.outputPerMillion)} out / 1M tokens
          </span>
        )}
      </div>
      <div className="grid content-start gap-1 bg-background p-3">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ZapIcon className="size-3.5" aria-hidden="true" /> Speed
        </span>
        <span className="inline-flex flex-wrap items-center gap-0.5 font-medium">
          {Array.from({ length: bolts }, (_, index) => (
            <ZapIcon
              key={index}
              className="size-3 fill-current"
              aria-hidden="true"
            />
          ))}
          <span className={bolts > 0 ? "ml-1" : undefined}>
            {speedLabel ?? "No benchmark"}
          </span>
        </span>
        {benchmark && (
          <span className="text-muted-foreground">
            {benchmark.tokensPerSecond} tokens/s
          </span>
        )}
      </div>
      <div className="grid content-start gap-1 bg-background p-3">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <BrainCircuitIcon className="size-3.5" aria-hidden="true" /> Reasoning
        </span>
        <span className="font-medium">
          {benchmark?.intelligence ?? "No score available"}
        </span>
      </div>
    </div>
  )
}
