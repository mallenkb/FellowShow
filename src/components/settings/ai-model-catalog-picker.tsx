import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AiModelOption } from "@/lib/ai-provider"

const MANUAL_MODEL_VALUE = "__manual_model_id__"

export type AiModelCatalogState = "idle" | "loading" | "success" | "error"

interface AiModelCatalogPickerProps {
  providerName: string
  model: string
  models: AiModelOption[]
  state: AiModelCatalogState
  message: string
  onSelect: (model: string) => void
  onLoad: () => void
}

export function AiModelCatalogPicker({
  providerName,
  model,
  models,
  state,
  message,
  onSelect,
  onLoad,
}: AiModelCatalogPickerProps) {
  const selectedValue = models.some((option) => option.id === model.trim())
    ? model.trim()
    : MANUAL_MODEL_VALUE

  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Available {providerName} models
      </span>
      <div className="flex flex-wrap gap-2">
        <Select
          value={selectedValue}
          disabled={models.length === 0}
          onValueChange={(value) => {
            if (value !== MANUAL_MODEL_VALUE) onSelect(value)
          }}
        >
          <SelectTrigger className="min-w-64 flex-1 text-xs">
            <SelectValue placeholder="Load models to choose" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            viewportClassName="max-h-72"
          >
            <SelectItem value={MANUAL_MODEL_VALUE}>
              Use manual model ID
            </SelectItem>
            {models.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                textValue={`${option.name ?? ""} ${option.id}`.trim()}
              >
                <span className="flex min-w-0 flex-col">
                  {option.name ? (
                    <span className="truncate text-xs">{option.name}</span>
                  ) : null}
                  <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
                    {option.id}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={state === "loading"}
          onClick={onLoad}
        >
          {state === "loading" ? (
            <LoaderCircleIcon className="size-3 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-3" />
          )}
          {models.length > 0 ? "Reload models" : "Load models"}
        </Button>
      </div>
      {message ? (
        <span
          role="status"
          aria-live="polite"
          className={`text-[0.625rem] ${
            state === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {message}
        </span>
      ) : null}
    </div>
  )
}
