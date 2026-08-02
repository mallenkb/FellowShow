import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
    <div className="grid gap-3">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Provider
      </span>
      <RadioGroup
        value={provider}
        onValueChange={(value) => {
          if (isAiProvider(value)) onChange(value)
        }}
        className="grid gap-3 md:grid-cols-2"
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20">
          <RadioGroupItem value="openrouter" className="mt-0.5" />
          <span className="min-w-0">
            <span className="block text-xs font-medium">OpenRouter</span>
            <span className="mt-1 block text-[0.625rem] leading-relaxed text-muted-foreground">
              Use a supported model through your OpenRouter account.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20">
          <RadioGroupItem value="openai" className="mt-0.5" />
          <span className="min-w-0">
            <span className="block text-xs font-medium">OpenAI (direct)</span>
            <span className="mt-1 block text-[0.625rem] leading-relaxed text-muted-foreground">
              Connect directly to the OpenAI API without OpenRouter.
            </span>
          </span>
        </label>
      </RadioGroup>
    </div>
  )
}
