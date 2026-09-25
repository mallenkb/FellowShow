import { LayersIcon, TimerIcon, type LucideIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  useSettingsStore,
  type OptionalSearchTab,
} from "@/stores/settings-store"

const EXTRA_TABS: {
  id: OptionalSearchTab
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    id: "on-display",
    label: "Video Overlays",
    description: "Logo, scrolling text, and lower thirds over the video feed.",
    icon: LayersIcon,
  },
  {
    id: "timer",
    label: "Timer",
    description: "Countdown and stage timers.",
    icon: TimerIcon,
  },
]

export function WorkspaceSection() {
  const extraSearchTabs = useSettingsStore((state) => state.extraSearchTabs)
  const toggleExtraSearchTab = useSettingsStore(
    (state) => state.toggleExtraSearchTab
  )

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The main screen shows Sermon, Songs, Notes, and Media. Turn on the tabs
        below to add them after those four.
      </p>
      <div className="space-y-3">
        {EXTRA_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <div
              key={tab.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {tab.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={extraSearchTabs.includes(tab.id)}
                onCheckedChange={() => toggleExtraSearchTab(tab.id)}
                aria-label={`Show the ${tab.label} tab`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
