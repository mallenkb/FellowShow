import { LogoOverlaySection } from "@/components/on-display/logo-overlay-section"
import { LowerThirdOverlaySection } from "@/components/on-display/lower-third-overlay-section"
import { TickerOverlaySection } from "@/components/on-display/ticker-overlay-section"

export function OnDisplayPanel() {
  return (
    <div className="min-h-0 [scrollbar-width:thin] space-y-3 overflow-y-auto pr-1">
      <LogoOverlaySection />
      <TickerOverlaySection />
      <LowerThirdOverlaySection />
    </div>
  )
}
