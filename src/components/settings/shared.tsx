import { Input } from "@/components/ui/input"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

export function StatusDot({ running }: { running: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`size-2 rounded-full ${
          running ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/30"
        }`}
      />
      <span className="text-[0.625rem] text-muted-foreground">
        {running ? "Listening" : "Stopped"}
      </span>
    </div>
  )
}

export function PortInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const numericValue = Number(value)
  const normalizedValue = Number.isFinite(numericValue) ? numericValue : 0
  const setPort = (nextValue: number) => {
    onChange(String(Math.min(65535, Math.max(1, nextValue))))
  }

  return (
    <div className="relative w-24">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className="h-7 pr-8 text-xs tabular-nums"
        disabled={disabled}
      />
      <div className="absolute inset-y-0 right-1 flex w-6 flex-col items-center justify-center">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setPort(normalizedValue + 1)}
          className="flex h-3 w-5 items-center justify-center rounded-sm text-foreground transition hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-40 dark:text-white"
          aria-label="Increase port"
        >
          <ChevronUpIcon className="size-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setPort(normalizedValue - 1)}
          className="flex h-3 w-5 items-center justify-center rounded-sm text-foreground transition hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-40 dark:text-white"
          aria-label="Decrease port"
        >
          <ChevronDownIcon className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
