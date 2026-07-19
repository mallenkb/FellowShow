import {
  ImageIcon,
  MessageSquareTextIcon,
  PanelsTopLeftIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useBroadcastStore } from "@/stores"

export function OnDisplayOverview() {
  const hasLogo = useBroadcastStore(
    (state) => state.overlayConfig.logo.logos.length > 0
  )
  const logoVisible = useBroadcastStore(
    (state) => state.activeOverlays.logoVisible
  )
  const tickerCount = useBroadcastStore(
    (state) => state.overlayConfig.tickerMessages.length
  )
  const tickerVisible = useBroadcastStore(
    (state) => state.activeOverlays.tickerMessageId !== null
  )
  const lowerThirdCount = useBroadcastStore(
    (state) => state.overlayConfig.lowerThirdPresets.length
  )
  const lowerThirdVisible = useBroadcastStore(
    (state) => state.activeOverlays.lowerThird !== null
  )

  const items = [
    {
      icon: ImageIcon,
      name: "Logo",
      detail: hasLogo ? "Logo ready" : "Choose a logo",
      visible: logoVisible,
    },
    {
      icon: MessageSquareTextIcon,
      name: "Scrolling text",
      detail: `${tickerCount} saved`,
      visible: tickerVisible,
    },
    {
      icon: PanelsTopLeftIcon,
      name: "Lower third",
      detail: `${lowerThirdCount} saved`,
      visible: lowerThirdVisible,
    },
  ]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Use the controls in the middle panel. Active overlays stay visible while
        you change the program underneath.
      </p>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/30 p-3"
          >
            <item.icon className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="block text-xs text-muted-foreground">
                {item.detail}
              </span>
            </span>
            <Badge
              variant="outline"
              className={
                item.visible
                  ? "border-red-500/50 bg-red-500/10 text-[0.625rem] font-semibold tracking-wide text-red-500 uppercase"
                  : "text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase"
              }
            >
              {item.visible ? "On" : "Off"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
