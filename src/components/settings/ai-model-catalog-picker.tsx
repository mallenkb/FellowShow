import { useId, useRef, useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  ListFilterIcon,
} from "lucide-react"
import { AiModelMetrics } from "./ai-model-metrics"
import {
  exampleSummaryCost,
  formatModelPrice,
  modelBenchmark,
} from "@/lib/ai-model-metrics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { AiModelOption } from "@/lib/ai-provider"
import { cn } from "@/lib/utils"

type ModelSort = "name" | "cost" | "speed" | "intelligence"

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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<ModelSort>("name")
  const [activeIndex, setActiveIndex] = useState(-1)
  const search = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = models.find((option) => option.id === model.trim())
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const matches = models.filter((option) => {
    const text = `${option.name ?? ""} ${option.id}`.toLowerCase()
    return terms.every((term) => text.includes(term))
  })
  if (sort !== "name") {
    const rank = (option: AiModelOption) => {
      if (sort === "cost") return exampleSummaryCost(option.pricing) ?? Infinity
      const benchmark = modelBenchmark(option.id)
      const score =
        sort === "speed" ? benchmark?.tokensPerSecond : benchmark?.intelligence
      return score === undefined ? Infinity : -score
    }
    matches.sort((first, second) => rank(first) - rank(second))
  }
  const active = matches[activeIndex]

  function choose(id: string) {
    onSelect(id)
    setOpen(false)
  }

  function moveActive(step: number) {
    if (!matches.length) return
    const index = active
      ? (activeIndex + step + matches.length) % matches.length
      : step > 0
        ? 0
        : matches.length - 1
    setActiveIndex(index)
    document
      .getElementById(`${listId}-${index}`)
      ?.scrollIntoView({ block: "nearest" })
  }

  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Model
      </span>
      <div className="flex flex-wrap gap-2">
        <Popover
          open={open && models.length > 0}
          onOpenChange={(next) => {
            setOpen(next)
            if (next) {
              setQuery("")
              setActiveIndex(-1)
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={`Choose a ${providerName} model: ${selected?.name ?? (model.trim() || "no selection")}`}
              className="min-w-0 flex-1 justify-between text-sm font-normal"
              disabled={models.length === 0}
            >
              <span className="truncate">
                {selected?.name ?? (model.trim() || "Select a model")}
              </span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) gap-0 overflow-hidden p-0"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              search.current?.focus()
            }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border p-2">
              <div className="relative min-w-0 flex-1">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={search}
                  role="combobox"
                  aria-label="Search models"
                  aria-autocomplete="list"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={
                    active ? `${listId}-${activeIndex}` : undefined
                  }
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search by name or ID"
                  className="pl-8"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActiveIndex(-1)
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault()
                      moveActive(event.key === "ArrowDown" ? 1 : -1)
                    } else if (event.key === "Enter" && matches.length > 0) {
                      event.preventDefault()
                      choose((active ?? matches[0]).id)
                    }
                  }}
                />
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Sort models"
                    title="Sort models"
                  >
                    <ListFilterIcon aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  aria-label="Sort models"
                  className="w-max min-w-max whitespace-nowrap"
                >
                  <DropdownMenuRadioGroup
                    value={sort}
                    onValueChange={(value) => {
                      if (
                        value === "name" ||
                        value === "cost" ||
                        value === "speed" ||
                        value === "intelligence"
                      ) {
                        setSort(value)
                        setActiveIndex(-1)
                      }
                    }}
                  >
                    <DropdownMenuRadioItem value="name">
                      Name
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="cost">
                      Lowest estimated cost
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="speed">
                      Fastest benchmark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="intelligence">
                      Highest intelligence score
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div
              id={listId}
              role="listbox"
              aria-label={`${providerName} models`}
              className="max-h-64 min-h-0 overflow-y-auto p-1"
            >
              {matches.map((option, index) => {
                const cost = exampleSummaryCost(option.pricing)
                const benchmark = modelBenchmark(option.id)
                return (
                  <button
                    key={option.id}
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={option.id === selected?.id}
                    tabIndex={-1}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent aria-selected:bg-primary/10 aria-selected:hover:bg-primary/15",
                      index === activeIndex && "bg-accent"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option.id)}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      {option.name && (
                        <span className="truncate text-sm">{option.name}</span>
                      )}
                      <span
                        className={cn(
                          "truncate",
                          option.name
                            ? "font-mono text-xs text-muted-foreground"
                            : "text-sm"
                        )}
                      >
                        {option.id}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-xs text-muted-foreground">
                      {cost !== undefined && (
                        <span>
                          {cost === 0 ? "Free" : formatModelPrice(cost)}
                        </span>
                      )}
                      {sort === "speed" && benchmark && (
                        <span>{benchmark.tokensPerSecond} tok/s</span>
                      )}
                      {sort === "intelligence" &&
                        benchmark?.intelligence !== undefined && (
                          <span>AA {benchmark.intelligence}</span>
                        )}
                    </span>
                    {option.id === selected?.id && (
                      <CheckIcon
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
            {matches.length === 0 && (
              <p
                role="status"
                className="px-3 py-2 text-xs text-muted-foreground"
              >
                No models match your search.
              </p>
            )}
          </PopoverContent>
        </Popover>
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
          {state === "loading"
            ? "Loading…"
            : models.length
              ? "Reload models"
              : "Load models"}
        </Button>
      </div>
      {selected && (
        <>
          <AiModelMetrics model={selected} />
          <p className="text-xs text-muted-foreground">
            Estimates use 10,000 input and 1,000 output tokens. Speed and
            intelligence are Artificial Analysis benchmarks.
            {providerName === "OpenAI" &&
              " OpenAI rates are standard pricing snapshots."}
          </p>
        </>
      )}
      {!selected && models.length > 0 && model.trim() && (
        <p className="text-xs text-muted-foreground">
          Your current model is outside this list. Choose an available model to
          switch.
        </p>
      )}
      {message && (
        <span
          role="status"
          className={cn(
            "text-xs",
            state === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {message}
        </span>
      )}
    </div>
  )
}
