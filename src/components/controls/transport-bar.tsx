import { lazy, Suspense, useEffect, useState } from "react"
import { HomeIcon, PaletteIcon, MonitorIcon, SettingsIcon } from "lucide-react"
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
          src="/fellowshow.svg"
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
            <HomeIcon />
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
