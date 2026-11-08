import { lazy, Suspense, useEffect, useState } from "react"
import { PaletteIcon, MonitorIcon, SettingsIcon } from "lucide-react"
import { useAppNavigationStore } from "@/stores/app-navigation-store"
import { Button } from "@/components/ui/button"
import { SermonControl } from "@/components/controls/sermon-control"
import { ServiceTitleEditor } from "@/components/controls/service-title-editor"
import {
  APP_HEADER_CLASS,
  APP_HEADER_LOGO_CLASS,
  APP_HEADER_TILE_CLASS,
  APP_HEADER_TILE_SURFACE_CLASS,
} from "@/components/controls/header-styles"
import { useTranscriptStore, useBroadcastStore, useSermonStore } from "@/stores"
import { useSettingsDialogStore } from "@/lib/settings-dialog"
import {
  openBroadcastSettings,
  useBroadcastSettingsDialogStore,
} from "@/lib/broadcast-settings-dialog"
import { generateLiveSermonNotes } from "@/lib/sermon-actions"
import { sermonListeningMs } from "@/lib/sermon-session"

const SettingsDialog = lazy(() =>
  import("@/components/settings-dialog").then((module) => ({
    default: module.SettingsDialog,
  }))
)
const ThemeDesigner = lazy(() =>
  import("@/components/broadcast/theme-designer").then((module) => ({
    default: module.ThemeDesigner,
  }))
)
const BroadcastSettings = lazy(() =>
  import("@/components/broadcast/broadcast-settings").then((module) => ({
    default: module.BroadcastSettings,
  }))
)

export function TransportBar({
  navigationRef,
}: {
  navigationRef?: (element: HTMLDivElement | null) => void
}) {
  const segmentCount = useTranscriptStore((s) => s.segments.length)
  const activeSession = useSermonStore((state) =>
    state.sessions.find((session) => session.id === state.activeSessionId)
  )
  const service = useSermonStore((state) =>
    state.sessions.find(
      (session) =>
        session.id === (state.activeSessionId ?? state.selectedSessionId)
    )
  )
  const isDesignerOpen = useBroadcastStore((s) => s.isDesignerOpen)
  const isSettingsOpen = useSettingsDialogStore((s) => s.isOpen)
  const broadcastOpen = useBroadcastSettingsDialogStore((s) => s.isOpen)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!activeSession) return
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [activeSession])

  useEffect(() => {
    if (!activeSession || segmentCount <= activeSession.lastNoteSegmentIndex)
      return
    const timer = window.setTimeout(() => {
      void generateLiveSermonNotes()
    }, 1_500)
    return () => window.clearTimeout(timer)
  }, [activeSession, segmentCount])

  const sermonElapsed = activeSession
    ? Math.max(0, Math.floor(sermonListeningMs(activeSession, now) / 1_000))
    : 0
  const sermonTime = `${Math.floor(sermonElapsed / 60)}:${String(
    sermonElapsed % 60
  ).padStart(2, "0")}`

  return (
    <div data-slot="transport-bar" className={APP_HEADER_CLASS}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <img
          src="/fellowshow-dark.png"
          alt="FellowShow"
          className={APP_HEADER_LOGO_CLASS}
          draggable={false}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Home"
            className={APP_HEADER_TILE_SURFACE_CLASS}
            onClick={() => useAppNavigationStore.getState().navigate("home")}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.12602 14C8.57006 15.7252 10.1362 17 12 17C13.8638 17 15.4299 15.7252 15.874 14M11.0177 2.764L4.23539 8.03912C3.78202 8.39175 3.55534 8.56806 3.39203 8.78886C3.24737 8.98444 3.1396 9.20478 3.07403 9.43905C3 9.70352 3 9.9907 3 10.5651V17.8C3 18.9201 3 19.4801 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4801 21 18.9201 21 17.8V10.5651C21 9.9907 21 9.70352 20.926 9.43905C20.8604 9.20478 20.7526 8.98444 20.608 8.78886C20.4447 8.56806 20.218 8.39175 19.7646 8.03913L12.9823 2.764C12.631 2.49075 12.4553 2.35412 12.2613 2.3016C12.0902 2.25526 11.9098 2.25526 11.7387 2.3016C11.5447 2.35412 11.369 2.49075 11.0177 2.764Z" />
            </svg>
          </Button>
          <div className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {navigationRef ? (
              <div
                ref={navigationRef}
                className="w-max rounded-[var(--workspace-nav-radius)] border border-border bg-background p-[3px] [--workspace-nav-radius:10px]"
              />
            ) : null}
          </div>
        </div>
      </div>
      {service?.title ? (
        <ServiceTitleEditor
          key={service.id}
          sessionId={service.id}
          title={service.title}
        />
      ) : null}
      <div
        className={
          service?.title
            ? "flex min-w-max flex-1 items-center justify-end gap-1 pl-5"
            : "flex shrink-0 items-center gap-1"
        }
      >
        <SermonControl
          layout="header"
          elapsed={activeSession ? sermonTime : undefined}
        />
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          className={APP_HEADER_TILE_CLASS}
          title="Displays"
          data-tour="broadcast"
          onClick={() => openBroadcastSettings()}
        >
          <MonitorIcon className="size-4" />
          Displays
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={APP_HEADER_TILE_CLASS}
          title="Themes"
          data-tour="theme"
          onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
        >
          <PaletteIcon className="size-4" />
          Themes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={APP_HEADER_TILE_CLASS}
          title="Settings"
          data-tour="settings"
          onClick={() => useSettingsDialogStore.getState().openSettings()}
        >
          <SettingsIcon className="size-4" />
          Settings
        </Button>
      </div>

      {broadcastOpen ? (
        <Suspense fallback={null}>
          <BroadcastSettings
            open={broadcastOpen}
            onOpenChange={(open) =>
              useBroadcastSettingsDialogStore.getState().setOpen(open)
            }
          />
        </Suspense>
      ) : null}
      {isDesignerOpen ? (
        <Suspense fallback={null}>
          <ThemeDesigner />
        </Suspense>
      ) : null}
      {isSettingsOpen ? (
        <Suspense fallback={null}>
          <SettingsDialog />
        </Suspense>
      ) : null}
    </div>
  )
}
