import { useState, useEffect, useCallback, useMemo } from "react"
import { Joyride, STATUS, type EventData } from "react-joyride"
import { toast } from "sonner"
import { useSettingsStore } from "@/stores/settings-store"
import {
  useTutorialStore,
  hydrateOnboardingState,
  persistOnboardingComplete,
} from "@/stores/tutorial-store"
import { TUTORIAL_STEPS } from "./tutorial-steps"
import { TutorialTooltip } from "./tutorial-tooltip"
import { useTheme } from "@/components/theme-provider"

export function TutorialOverlay() {
  const isRunning = useTutorialStore((s) => s.isRunning)
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete)
  const { theme } = useTheme()
  const skipTutorial = useMemo(() => {
    if (import.meta.env.DEV) return true
    if (typeof window === "undefined") return false
    const params = new URLSearchParams(window.location.search)
    return (
      params.get("skipOnboarding") === "1" ||
      params.get("skipOnboarding") === "true"
    )
  }, [])
  const [isHydrated, setIsHydrated] = useState(skipTutorial)

  const [arrowColor, setArrowColor] = useState<string | undefined>()

  useEffect(() => {
    requestAnimationFrame(() => {
      const cardEl = document.querySelector(".bg-card")
      if (cardEl) {
        setArrowColor(getComputedStyle(cardEl).backgroundColor)
      }
    })
  }, [theme])

  const steps = useMemo(
    () =>
      TUTORIAL_STEPS.map((step) => ({
        ...step,
        arrowColor,
      })),
    [arrowColor]
  )

  useEffect(() => {
    if (skipTutorial) {
      useSettingsStore.getState().setOnboardingComplete(true)
      return
    }

    void hydrateOnboardingState()
      .then(() => setIsHydrated(true))
      .catch(console.error)
  }, [skipTutorial])

  useEffect(() => {
    if (skipTutorial) return

    if (isHydrated && !onboardingComplete) {
      const timer = setTimeout(() => {
        useTutorialStore.getState().startTutorial()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isHydrated, onboardingComplete, skipTutorial])

  const handleEvent = useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      useTutorialStore.getState().stopTutorial()
      void persistOnboardingComplete().catch(console.error)

      if (data.status === STATUS.SKIPPED) {
        toast.info("Tutorial skipped", {
          description: "Restart anytime in Settings.",
        })
      }
    }
  }, [])

  if (!isHydrated || skipTutorial) return null

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      continuous
      options={{
        buttons: ["back", "primary", "skip"],
        skipScroll: true,
        overlayColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 60,
      }}
      tooltipComponent={TutorialTooltip}
      onEvent={handleEvent}
    />
  )
}
