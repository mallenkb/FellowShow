import { Switch } from "@/components/ui/switch"
import {
  useSettingsStore,
  type OptionalSearchTab,
} from "@/stores/settings-store"

const EXTRA_TABS: {
  id: OptionalSearchTab
  label: string
  description: string
}[] = [
  {
    id: "on-display",
    label: "Video Overlays",
    description: "Logos, bars, lower thirds and scrolling text over video.",
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
        Choose which additional tabs appear in the header.
      </p>
      <div className="divide-y divide-border">
        {EXTRA_TABS.map((tab) => (
          <div
            key={tab.id}
            className="flex items-center justify-between gap-4 py-4 first:pt-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{tab.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tab.description}
              </p>
            </div>
            <Switch
              checked={extraSearchTabs.includes(tab.id)}
              onCheckedChange={() => toggleExtraSearchTab(tab.id)}
              aria-label={`Show the ${tab.label} tab`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
