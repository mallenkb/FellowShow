import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SliderField } from "@/components/ui/slider-field"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import type { BroadcastTheme } from "@/types"
import { sectionFromMode, type ThemeAwareMode } from "./preview-panel-shared"

export function MotionPanel({ mode }: { mode: ThemeAwareMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)

  const selectedSection = sectionFromMode(mode)
  const activeThemeId = sectionThemeIds[selectedSection]
  const activeTheme = themes.find((theme) => theme.id === activeThemeId) ?? null

  const updateActiveTransition = (
    transitionUpdates: Partial<BroadcastTheme["transition"]>
  ) => {
    if (!activeTheme) return
    const store = useBroadcastStore.getState()
    const updatedTheme: BroadcastTheme = {
      ...activeTheme,
      id: activeTheme.builtin ? crypto.randomUUID() : activeTheme.id,
      name: activeTheme.builtin
        ? `${activeTheme.name} Custom`
        : activeTheme.name,
      builtin: false,
      createdAt: activeTheme.createdAt,
      updatedAt: activeTheme.updatedAt + 1,
      transition: {
        ...activeTheme.transition,
        ...transitionUpdates,
      },
    }
    store.saveTheme(updatedTheme)
    if (updatedTheme.id !== activeTheme.id) {
      store.setActiveTheme(updatedTheme.id, selectedSection)
    } else {
      store.syncBroadcastOutputFor("main")
    }
  }

  return (
    <motion.div
      data-slot="motion-panel"
      initial={false}
      animate={{ height: isOpen ? "auto" : 44 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 shrink-0 items-center justify-between px-3 text-left transition hover:bg-muted/35"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Motion
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && activeTheme && (
          <motion.div
            key="motion-content"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="grid gap-3 px-4 pt-1 pb-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Animation
              </label>
              <Select
                value={activeTheme.transition.type}
                onValueChange={(value) =>
                  updateActiveTransition({
                    type: value as BroadcastTheme["transition"]["type"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeTheme.transition.type !== "none" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Easing
                  </label>
                  <Select
                    value={activeTheme.transition.easing}
                    onValueChange={(value) =>
                      updateActiveTransition({
                        easing: value as BroadcastTheme["transition"]["easing"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ease-in-out">Ease in/out</SelectItem>
                      <SelectItem value="ease-in">Ease in</SelectItem>
                      <SelectItem value="ease-out">Ease out</SelectItem>
                      <SelectItem value="linear">Linear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <SliderField
                    label="Duration"
                    value={activeTheme.transition.duration}
                    min={100}
                    max={2000}
                    step={50}
                    unit="ms"
                    defaultValue={500}
                    onChange={(value) =>
                      updateActiveTransition({ duration: value })
                    }
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
