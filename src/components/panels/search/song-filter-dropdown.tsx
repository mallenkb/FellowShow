import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import type { CopSongSource } from "@/lib/cop-songs"

type SongSourceFilter = "all" | Exclude<CopSongSource, "built-in">
const LYRIC_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const songSourceOptions: { value: SongSourceFilter; label: string }[] = [
  { value: "all", label: "All songs" },
  { value: "theme-2026", label: "2026 Theme" },
  { value: "theme-2025", label: "2025 Theme" },
  { value: "pentecostal-book", label: "Pentecostal Book" },
]

export function SongFilterDropdown({
  sourceValue,
  letterValue,
  onSourceChange,
  onLetterChange,
}: {
  sourceValue: SongSourceFilter
  letterValue: string
  onSourceChange: (value: SongSourceFilter) => void
  onLetterChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    top: 0,
    width: 260,
  })
  const letterOptions = ["all", ...LYRIC_LETTERS]
  const sourceLabel =
    songSourceOptions.find((option) => option.value === sourceValue)?.label ??
    "All songs"
  const letterLabel = letterValue === "all" ? "All" : letterValue
  const label =
    sourceValue === "all" && letterValue === "all"
      ? "All songs"
      : sourceValue !== "all" && letterValue !== "all"
        ? `${sourceLabel} · ${letterLabel}`
        : sourceValue !== "all"
          ? sourceLabel
          : `${letterLabel} songs`

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const width = Math.max(260, Math.round(rect.width))
    setMenuPosition({
      left: Math.round(rect.right - width),
      top: Math.round(rect.bottom + 6),
      width,
    })
  }, [])

  const toggleOpen = useCallback(() => {
    updateMenuPosition()
    setOpen((current) => !current)
  }, [updateMenuPosition])

  useEffect(() => {
    if (!open) return

    updateMenuPosition()

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      )
        return
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    const handleViewportChange = () => {
      updateMenuPosition()
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [open, updateMenuPosition])

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex h-10 w-44 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30 dark:hover:bg-input/50"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              width: menuPosition.width,
            }}
            className="fixed z-50 overflow-hidden rounded-md border border-border bg-popover shadow-lg ring-1 ring-foreground/10"
          >
            <div className="max-h-80 [scrollbar-width:thin] overflow-y-auto overscroll-contain p-1">
              <div className="px-2 py-1.5 text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Song type
              </div>
              {songSourceOptions.map((option) => {
                const isSelected = option.value === sourceValue

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-selected={isSelected}
                    aria-checked={isSelected}
                    onClick={() => {
                      onSourceChange(option.value)
                    }}
                    className={cn(
                      "flex h-9 w-full items-center justify-between rounded-sm px-2 text-left text-sm transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none",
                      isSelected && "bg-foreground/10 text-foreground"
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <CheckIcon className="size-4 text-[#101084] dark:text-[#F1E600]" />
                    )}
                  </button>
                )
              })}
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1.5 text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Starts with
              </div>
              <div className="grid grid-cols-5 gap-1 p-1">
                {letterOptions.map((option) => {
                  const isSelected = option === letterValue
                  const optionLabel = option === "all" ? "All" : option

                  return (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-selected={isSelected}
                      aria-checked={isSelected}
                      onClick={() => {
                        onLetterChange(option)
                      }}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-sm px-2 text-sm transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none",
                        isSelected && "bg-foreground/10 text-foreground"
                      )}
                    >
                      {optionLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
