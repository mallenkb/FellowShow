import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const APPEARANCE_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-sm font-medium">App theme</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose light or dark, or match your system setting.
        </p>
      </div>
      <RadioGroup
        aria-label="App theme"
        value={theme}
        onValueChange={(value) => {
          if (value === "light" || value === "dark" || value === "system") {
            setTheme(value)
          }
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary-emphasis/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary-emphasis/20"
          >
            <RadioGroupItem value={value} />
            <Icon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  )
}
