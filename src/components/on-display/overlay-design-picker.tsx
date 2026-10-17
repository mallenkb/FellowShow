import { useRef, useState, type ReactNode } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DesignOption<T extends string> {
  value: T
  label: string
  description: string
}

/**
 * A dropdown of designs where every choice shows a live thumbnail. The
 * trigger shows the current design so the choice is always visible.
 */
export function OverlayDesignPicker<T extends string>({
  label,
  value,
  options,
  renderThumbnail,
  onChange,
}: {
  label: string
  value: T
  options: readonly DesignOption<T>[]
  renderThumbnail: (value: T) => ReactNode
  onChange: (value: T) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedOptionRef = useRef<HTMLButtonElement>(null)
  const current = options.find((option) => option.value === value)
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {/* Modal so the list can scroll while it sits inside a dialog. */}
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${current?.label ?? value}`}
            className="grid w-full min-w-0 gap-1.5 overflow-hidden rounded-lg border border-border bg-background p-1.5 text-left transition-colors hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex min-w-0 items-center justify-between gap-2 px-1 pt-0.5 text-xs font-medium">
              <span className="truncate">{current?.label ?? value}</span>
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </span>
            <span className="block overflow-hidden rounded-md">
              {renderThumbnail(value)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          // Always opens below the trigger; the list scrolls to fit the space.
          avoidCollisions={false}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            selectedOptionRef.current?.focus({ preventScroll: true })
            selectedOptionRef.current?.scrollIntoView?.({ block: "nearest" })
          }}
          style={{
            maxHeight:
              "max(10rem, min(20rem, var(--radix-popover-content-available-height, 20rem)))",
            overflowY: "auto",
            scrollbarGutter: "stable",
          }}
          className="block w-[max(var(--radix-popover-trigger-width),22rem)] max-w-[calc(100vw-1.5rem)] overflow-x-hidden overscroll-contain p-2"
        >
          <div
            role="listbox"
            aria-label={label}
            className="grid min-w-0 grid-cols-1 gap-2"
          >
            {options.map((option) => {
              const selected = option.value === value
              return (
                <button
                  key={option.value}
                  ref={selected ? selectedOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={option.label}
                  title={option.description}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "relative grid w-full min-w-0 gap-1 overflow-hidden rounded-lg border p-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <span className="truncate px-1 pt-0.5 text-[0.6875rem] font-medium">
                    {option.label}
                  </span>
                  <span className="block overflow-hidden rounded-md">
                    {renderThumbnail(option.value)}
                  </span>
                  {selected ? (
                    <CheckIcon className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary p-0.5 text-primary-foreground" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
