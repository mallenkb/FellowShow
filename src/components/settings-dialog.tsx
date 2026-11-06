import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BookOpenIcon,
  BrainCircuitIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  MicIcon,
  MusicIcon,
  RadioIcon,
  RefreshCwIcon,
  SparklesIcon,
  SunIcon,
  TvIcon,
  XIcon,
} from "lucide-react"
import {
  useSettingsDialogStore,
  type SettingsSection,
} from "@/lib/settings-dialog"
import { cn } from "@/lib/utils"
import { AudioSection } from "@/components/settings/audio-section"
import { AiModelSection } from "@/components/settings/ai-model-section"
import { BibleSection } from "@/components/settings/bible-section"
import { DisplayModeSection } from "@/components/settings/display-mode-section"
import { HelpSection } from "@/components/settings/help-section"
import { RemoteControlSection } from "@/components/settings/remote-control-section"
import { SpeechSection } from "@/components/settings/speech-section"
import { UpdatesSection } from "@/components/settings/updates-section"
import { WorkspaceSection } from "@/components/settings/workspace-section"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { SongCollectionsSection } from "@/components/settings/song-collections-section"

type NavSection = SettingsSection

const navGroups: {
  name: string
  id: string
  items: { name: string; id: NavSection; icon: React.ReactNode }[]
}[] = [
  {
    name: "Setup",
    id: "setup",
    items: [
      { name: "Audio", id: "audio", icon: <MicIcon strokeWidth={2} /> },
      {
        name: "Speech Recognition",
        id: "speech",
        icon: <BrainCircuitIcon strokeWidth={2} />,
      },
      {
        name: "AI Model",
        id: "ai-model",
        icon: <SparklesIcon strokeWidth={2} />,
      },
      {
        name: "Scriptures",
        id: "bible",
        icon: <BookOpenIcon strokeWidth={2} />,
      },
      {
        name: "Song collections",
        id: "songs",
        icon: <MusicIcon strokeWidth={2} />,
      },
    ],
  },
  {
    name: "Output",
    id: "output",
    items: [
      { name: "Display Mode", id: "display", icon: <TvIcon strokeWidth={2} /> },
    ],
  },
  {
    name: "Preferences",
    id: "preferences",
    items: [
      {
        name: "Workspace",
        id: "workspace",
        icon: <LayoutGridIcon strokeWidth={2} />,
      },
      {
        name: "Appearance",
        id: "appearance",
        icon: <SunIcon strokeWidth={2} />,
      },
    ],
  },
  {
    name: "Integrations",
    id: "integrations",
    items: [
      {
        name: "Remote Control",
        id: "remote",
        icon: <RadioIcon strokeWidth={2} />,
      },
    ],
  },
  {
    name: "Maintenance",
    id: "maintenance",
    items: [
      {
        name: "Updates",
        id: "updates",
        icon: <RefreshCwIcon strokeWidth={2} />,
      },
    ],
  },
  {
    name: "Help",
    id: "help",
    items: [
      { name: "Help", id: "help", icon: <HelpCircleIcon strokeWidth={2} /> },
    ],
  },
]

const sectionTitles: Record<NavSection, string> = {
  audio: "Audio",
  speech: "Speech Recognition",
  "ai-model": "AI Model Provider",
  bible: "Scripture Translation",
  songs: "Song collections",
  display: "Display Mode",
  workspace: "Workspace",
  appearance: "Appearance",
  remote: "Remote Control",
  updates: "Updates",
  help: "Help",
}

const sectionComponents: Record<NavSection, React.FC> = {
  audio: AudioSection,
  speech: SpeechSection,
  "ai-model": AiModelSection,
  bible: BibleSection,
  songs: SongCollectionsSection,
  display: DisplayModeSection,
  workspace: WorkspaceSection,
  appearance: AppearanceSection,
  remote: RemoteControlSection,
  updates: UpdatesSection,
  help: HelpSection,
}

/*  Settings modal                                                            */
/* -------------------------------------------------------------------------- */

export function SettingsDialog() {
  const open = useSettingsDialogStore((s) => s.isOpen)
  const activeSection = useSettingsDialogStore((s) => s.activeSection)
  const setActiveSection = useSettingsDialogStore((s) => s.setActiveSection)
  const closeSettings = useSettingsDialogStore((s) => s.closeSettings)
  const previousFocusRef = useRef(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  )

  const ActiveContent = sectionComponents[activeSection]

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeSettings()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="@container/settings-modal flex h-[min(42rem,calc(100dvh_-_2rem))] w-[calc(100vw_-_2rem)] max-w-4xl flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-4xl"
        onCloseAutoFocus={(event) => {
          if (previousFocusRef.current?.isConnected) {
            event.preventDefault()
            previousFocusRef.current.focus()
          }
        }}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a section to manage FellowShow settings.
        </DialogDescription>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden min-h-0 w-56 shrink-0 flex-col border-r border-border bg-background @[42rem]/settings-modal:flex">
            <div className="flex h-14 shrink-0 items-center px-5 text-sm font-semibold">
              Settings
            </div>
            <nav
              aria-label="Settings sections"
              className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
            >
              {navGroups.map((group) => (
                <section
                  key={group.id}
                  aria-labelledby={`settings-group-${group.id}`}
                  className="mb-4 last:mb-0"
                >
                  <h3
                    id={`settings-group-${group.id}`}
                    className="px-3 pb-1.5 text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase"
                  >
                    {group.name}
                  </h3>
                  {group.items.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-current={
                        item.id === activeSection ? "page" : undefined
                      }
                      className={cn(
                        "h-9 w-full justify-start gap-3 px-3 text-xs font-normal text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-muted/50",
                        item.id === activeSection &&
                          "bg-primary/10 font-medium text-primary-emphasis hover:bg-primary/10 hover:text-primary-emphasis"
                      )}
                      onClick={() => setActiveSection(item.id)}
                    >
                      {item.icon}
                      {item.name}
                    </Button>
                  ))}
                </section>
              ))}
            </nav>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs text-muted-foreground @[42rem]/settings-modal:hidden">
                  Settings /
                </span>
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {sectionTitles[activeSection]}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close settings"
                onClick={closeSettings}
              >
                <XIcon className="size-4" />
              </Button>
            </header>
            <div className="shrink-0 border-b border-border bg-background px-3 py-2 @[42rem]/settings-modal:hidden">
              <Select
                value={activeSection}
                onValueChange={(value) => {
                  const section = navGroups
                    .flatMap((group) => group.items)
                    .find((item) => item.id === value)
                  if (section) setActiveSection(section.id)
                }}
              >
                <SelectTrigger className="w-full" aria-label="Settings section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {navGroups.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>{group.name}</SelectLabel>
                      {group.items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.icon}
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="flex min-h-full w-full flex-col p-5 @[42rem]/settings-modal:p-6">
                <ActiveContent />
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
