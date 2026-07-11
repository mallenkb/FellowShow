import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  BookOpenIcon,
  BrainCircuitIcon,
  HelpCircleIcon,
  MicIcon,
  RadioIcon,
  RefreshCwIcon,
  SettingsIcon,
  TvIcon,
  XIcon,
} from "lucide-react"
import { useSettingsDialogStore } from "@/lib/settings-dialog"
import { AudioSection } from "@/components/settings/audio-section"
import { BibleSection } from "@/components/settings/bible-section"
import { DisplayModeSection } from "@/components/settings/display-mode-section"
import { HelpSection } from "@/components/settings/help-section"
import { RemoteControlSection } from "@/components/settings/remote-control-section"
import { SpeechSection } from "@/components/settings/speech-section"
import { UpdatesSection } from "@/components/settings/updates-section"

type NavSection =
  "audio" | "speech" | "bible" | "display" | "remote" | "updates" | "help"

const navItems: { name: string; id: NavSection; icon: React.ReactNode }[] = [
  {
    name: "Audio",
    id: "audio",
    icon: <MicIcon strokeWidth={2} />,
  },
  {
    name: "Speech Recognition",
    id: "speech",
    icon: <BrainCircuitIcon strokeWidth={2} />,
  },
  {
    name: "Scriptures",
    id: "bible",
    icon: <BookOpenIcon strokeWidth={2} />,
  },
  {
    name: "Display Mode",
    id: "display",
    icon: <TvIcon strokeWidth={2} />,
  },
  {
    name: "Remote Control",
    id: "remote",
    icon: <RadioIcon strokeWidth={2} />,
  },
  {
    name: "Updates",
    id: "updates",
    icon: <RefreshCwIcon strokeWidth={2} />,
  },
  {
    name: "Help",
    id: "help",
    icon: <HelpCircleIcon strokeWidth={2} />,
  },
]

const sectionTitles: Record<NavSection, string> = {
  audio: "Audio",
  speech: "Speech Recognition",
  bible: "Scripture Translation",
  display: "Display Mode",
  remote: "Remote Control",
  updates: "Updates",
  help: "Help",
}

const sectionComponents: Record<NavSection, React.FC> = {
  audio: AudioSection,
  speech: SpeechSection,
  bible: BibleSection,
  display: DisplayModeSection,
  remote: RemoteControlSection,
  updates: UpdatesSection,
  help: HelpSection,
}

/*  Main settings page                                                        */
/* -------------------------------------------------------------------------- */

export function SettingsDialog() {
  const open = useSettingsDialogStore((s) => s.isOpen)
  const activeSection = useSettingsDialogStore((s) => s.activeSection)
  const setActiveSection = useSettingsDialogStore((s) => s.setActiveSection)
  const openSettingsFn = useSettingsDialogStore((s) => s.openSettings)
  const closeSettings = useSettingsDialogStore((s) => s.closeSettings)

  const ActiveContent = sectionComponents[activeSection]

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        data-tour="settings"
        title="Settings"
        onClick={() => openSettingsFn()}
      >
        <SettingsIcon className="size-3.5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              <SettingsIcon className="size-4 text-muted-foreground" />
              <div>
                <h1 className="text-sm font-semibold text-foreground">
                  Settings
                </h1>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Configure audio, scriptures, display, remote control, and API
                  keys.
                </p>
              </div>
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

          <SidebarProvider className="h-full min-h-0! flex-1 items-start overflow-hidden">
            <Sidebar collapsible="none" className="hidden md:flex">
              <SidebarContent className="border-r border-border pt-3">
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={item.id === activeSection}
                            onClick={() => setActiveSection(item.id)}
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <nav
                aria-label="Settings sections"
                className="flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto border-b border-border bg-background px-3 py-2 md:hidden"
              >
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={item.id === activeSection ? "secondary" : "ghost"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.icon}
                    {item.name}
                  </Button>
                ))}
              </nav>

              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
                <h2 className="text-sm font-semibold text-foreground">
                  {sectionTitles[activeSection]}
                </h2>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="flex min-h-full w-full flex-col p-4 md:p-6 lg:max-w-5xl">
                  <ActiveContent />
                </div>
              </div>
            </main>
          </SidebarProvider>
        </div>
      ) : null}
    </>
  )
}
