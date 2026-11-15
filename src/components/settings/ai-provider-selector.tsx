import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isAiProvider, type AiProvider } from "@/stores/settings-store"

interface AiProviderSelectorProps {
  provider: AiProvider
  onChange: (provider: AiProvider) => void
}

export function AiProviderSelector({
  provider,
  onChange,
}: AiProviderSelectorProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor="summary-provider" className="text-xs font-medium">
        Provider
      </label>
      <Select
        value={provider}
        onValueChange={(value) => {
          if (isAiProvider(value)) onChange(value)
        }}
      >
        <SelectTrigger id="summary-provider" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openrouter">OpenRouter</SelectItem>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="off">Off</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
