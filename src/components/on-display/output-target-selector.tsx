import { MonitorIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBroadcastStore } from "@/stores"

interface OutputTargetSelectorProps {
  value: string[]
  onChange: (outputIds: string[]) => void
}

export function OutputTargetSelector({
  value,
  onChange,
}: OutputTargetSelectorProps) {
  const outputs = useBroadcastStore((state) => state.outputs)
  const selectedOutputs = outputs.filter((output) => value.includes(output.id))
  const label =
    selectedOutputs.length === 1
      ? selectedOutputs[0].name
      : `${selectedOutputs.length} outputs`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <MonitorIcon />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-2 p-3">
        <PopoverTitle className="text-sm">Show on</PopoverTitle>
        <div className="grid gap-1">
          {outputs.map((output) => {
            const checked = value.includes(output.id)
            return (
              <label
                key={output.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={checked && value.length === 1}
                  onChange={(event) => {
                    onChange(
                      event.target.checked
                        ? [...value, output.id]
                        : value.filter((id) => id !== output.id)
                    )
                  }}
                  className="size-4 accent-primary"
                />
                <span className="min-w-0 truncate text-sm">{output.name}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
