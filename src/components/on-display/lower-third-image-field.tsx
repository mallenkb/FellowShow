import { useRef, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { cachePresentationMedia } from "@/lib/presentation-media"

export function LowerThirdImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (url: string | undefined) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await cachePresentationMedia(file, file.name))
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not load image."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex items-center gap-2">
        {value ? (
          <img
            src={value}
            alt={`${label} preview`}
            className="size-10 rounded bg-muted object-contain"
          />
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={`Upload ${label.toLowerCase()}`}
          className="hidden"
          onChange={(event) => {
            void upload(event).catch((failure: unknown) =>
              setError(String(failure))
            )
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Loading..." : `Choose ${label.toLowerCase()}`}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
