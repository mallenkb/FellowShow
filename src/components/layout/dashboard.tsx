import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { TransportBar } from "@/components/controls/transport-bar"
import { SermonSessionNotice } from "@/components/controls/sermon-session-notice"
import { DashboardResizeHandle } from "@/components/layout/dashboard-resize-handle"
import { useDashboardLayout } from "@/components/layout/use-dashboard-layout"
import { TranscriptPanel } from "@/components/panels/transcript-panel"
import { MotionPanel } from "@/components/panels/motion-panel"
import { PreviewPanel } from "@/components/panels/preview-panel"
import { ThemesPanel } from "@/components/panels/themes-panel"
import { LiveOutputPanel } from "@/components/panels/live-output-panel"
import { OutputsMultiviewPanel } from "@/components/panels/outputs-multiview-panel"
import { QueuePanel } from "@/components/panels/queue-panel"
import { SearchPanel } from "@/components/panels/search-panel"
import { SongsQueuePanel } from "@/components/panels/songs-queue-panel"
import { isBackgroundPreviewStaging } from "@/lib/preview-staging"
import { useBroadcastStore } from "@/stores"

const PresentationPanel = lazy(() =>
  import("@/components/panels/presentation-panel").then((module) => ({
    default: module.PresentationPanel,
  }))
)
const AnnouncementWorkspace = lazy(() =>
  import("@/components/panels/announcement-workspace").then((module) => ({
    default: module.AnnouncementWorkspace,
  }))
)
const OnDisplayPanel = lazy(() =>
  import("@/components/panels/on-display-panel").then((module) => ({
    default: module.OnDisplayPanel,
  }))
)

type SearchMode =
  "book" | "context" | "songs" | "announcements" | "presentation" | "on-display"

const SHOW_MOTION_PANEL = false

export function Dashboard() {
  const {
    gridRef,
    middleRef,
    queueRef,
    columnTemplate,
    mediaColumnTemplate,
    overlayColumnTemplate,
    rowTemplate,
    queueRowTemplate,
    startColumnResize,
    startRowResize,
    nudgeColumn,
    nudgeRow,
  } = useDashboardLayout()
  const [navigationTarget, setNavigationTarget] =
    useState<HTMLDivElement | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>("book")
  const [previewMode, setPreviewMode] = useState<"content" | "overlays">(
    "content"
  )
  const [overlayActionPending, setOverlayActionPending] = useState(false)
  const [visited, setVisited] = useState({
    songs: false,
    announcements: false,
    presentation: false,
  })
  const hasAuxiliaryWorkspace =
    searchMode === "songs" ||
    searchMode === "announcements" ||
    searchMode === "presentation"
  const focusedWorkspace =
    searchMode === "presentation"
      ? "media"
      : searchMode === "on-display"
        ? "overlays"
        : null
  const showSermonWorkspace =
    searchMode !== "songs" &&
    searchMode !== "announcements" &&
    focusedWorkspace === null

  // Staging from any existing content or graphics workflow selects the matching
  // main Preview. The overlay panel does not need its own thumbnail.
  useEffect(
    () =>
      useBroadcastStore.subscribe((state, previous) => {
        if (
          state.previewVerse !== previous.previewVerse &&
          !isBackgroundPreviewStaging()
        ) {
          setPreviewMode("content")
        } else if (state.stagedOverlays !== previous.stagedOverlays) {
          setPreviewMode("overlays")
        }
      }),
    []
  )

  const showOverlayPreview = useCallback(() => setPreviewMode("overlays"), [])
  const handleSearchModeChange = useCallback((mode: SearchMode) => {
    setSearchMode(mode)
    setPreviewMode(mode === "on-display" ? "overlays" : "content")
    if (
      mode === "songs" ||
      mode === "announcements" ||
      mode === "presentation"
    ) {
      setVisited((current) =>
        current[mode] ? current : { ...current, [mode]: true }
      )
    }
    const section =
      mode === "songs"
        ? "songs"
        : mode === "announcements"
          ? "announcements"
          : mode === "presentation"
            ? "presentation"
            : "bible"
    useBroadcastStore.getState().setSelectedThemeSection(section)
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        inset: "0px",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        rowGap: "4px",
        overflow: "hidden",
      }}
      className="bg-background"
    >
      <div>
        <TransportBar navigationRef={setNavigationTarget} />
        <SermonSessionNotice />
      </div>

      <div
        ref={gridRef}
        className="grid min-h-0 bg-background *:min-h-0"
        style={{
          gridTemplateColumns:
            focusedWorkspace === "media"
              ? mediaColumnTemplate
              : focusedWorkspace === "overlays"
                ? overlayColumnTemplate
                : columnTemplate,
        }}
      >
        <div
          className="grid min-h-0 *:min-h-0"
          onClickCapture={() =>
            setPreviewMode(searchMode === "on-display" ? "overlays" : "content")
          }
          onKeyDownCapture={(event) => {
            if (["Enter", " ", "ArrowUp", "ArrowDown"].includes(event.key)) {
              setPreviewMode(
                searchMode === "on-display" ? "overlays" : "content"
              )
            }
          }}
        >
          <SearchPanel
            navigationTarget={navigationTarget}
            onSearchModeChange={handleSearchModeChange}
          />
        </div>
        <DashboardResizeHandle
          label={
            focusedWorkspace === "media"
              ? "Resize media library and editor columns"
              : focusedWorkspace === "overlays"
                ? "Resize saved looks and overlay controls columns"
                : "Resize Bible and transcript columns"
          }
          onPointerDown={(event) =>
            startColumnResize(0, event, focusedWorkspace)
          }
          onNudge={(amount) => nudgeColumn(0, amount, focusedWorkspace)}
        />

        <div
          ref={middleRef}
          className={
            focusedWorkspace === "media"
              ? "invisible grid min-h-0 min-w-0 overflow-hidden *:min-h-0"
              : "grid min-h-0 min-w-0 *:min-h-0"
          }
          aria-hidden={focusedWorkspace === "media" || undefined}
          style={{
            gridTemplateRows:
              focusedWorkspace === "overlays"
                ? "0px 0px minmax(0, 1fr)"
                : rowTemplate,
          }}
        >
          <div
            className={
              focusedWorkspace === "overlays"
                ? "invisible grid min-h-0 min-w-0 overflow-hidden *:min-h-0"
                : "grid min-h-0 min-w-0 *:min-h-0"
            }
            aria-hidden={focusedWorkspace === "overlays" || undefined}
          >
            <TranscriptPanel isVisible={focusedWorkspace === null} />
          </div>
          <DashboardResizeHandle
            direction="row"
            label="Resize transcript and overlay pads"
            isHidden={focusedWorkspace !== null}
            onPointerDown={(event) => startRowResize("middle", event)}
            onNudge={(amount) => nudgeRow("middle", amount)}
          />
          <Suspense
            fallback={
              <div role="status" className="p-4 text-sm text-muted-foreground">
                Loading overlay pads…
              </div>
            }
          >
            <OnDisplayPanel onPreviewRequest={showOverlayPreview} />
          </Suspense>
        </div>

        <DashboardResizeHandle
          label="Resize overlay and scripture queue columns"
          isHidden={focusedWorkspace !== null}
          onPointerDown={(event) => startColumnResize(1, event)}
          onNudge={(amount) => nudgeColumn(1, amount)}
        />
        <div
          className={
            focusedWorkspace === "overlays"
              ? "invisible grid min-h-0 min-w-0 overflow-hidden *:min-h-0"
              : "grid min-h-0 min-w-0 *:min-h-0"
          }
          aria-hidden={focusedWorkspace === "overlays" || undefined}
          onClickCapture={() => setPreviewMode("content")}
          onKeyDownCapture={(event) => {
            if (["Enter", " ", "ArrowUp", "ArrowDown"].includes(event.key)) {
              setPreviewMode("content")
            }
          }}
          style={{
            gridTemplateRows:
              hasAuxiliaryWorkspace && showSermonWorkspace
                ? "minmax(0, 0.42fr) minmax(0, 0.58fr)"
                : "minmax(0, 1fr)",
          }}
        >
          <div
            className={
              showSermonWorkspace ? "grid min-h-0 *:min-h-0" : "hidden"
            }
          >
            <QueuePanel
              mode={searchMode === "context" ? "context" : "book"}
              isActive={showSermonWorkspace}
              splitRef={queueRef}
              rowTemplate={queueRowTemplate}
              onResizeStart={(event) => startRowResize("queue", event)}
              onResizeNudge={(amount) => nudgeRow("queue", amount)}
            />
          </div>
          <div
            className={
              hasAuxiliaryWorkspace ? "grid min-h-0 *:min-h-0" : "hidden"
            }
          >
            {visited.songs ? (
              <div
                className={
                  searchMode === "songs" ? "grid min-h-0 *:min-h-0" : "hidden"
                }
              >
                <SongsQueuePanel isActive={searchMode === "songs"} />
              </div>
            ) : null}
            <Suspense
              fallback={
                <div
                  role="status"
                  className="p-4 text-sm text-muted-foreground"
                >
                  Loading workspace…
                </div>
              }
            >
              {visited.presentation ? (
                <div
                  className={
                    searchMode === "presentation"
                      ? "grid min-h-0 *:min-h-0"
                      : "hidden"
                  }
                >
                  <PresentationPanel isActive={searchMode === "presentation"} />
                </div>
              ) : null}
              {visited.announcements ? (
                <div
                  className={
                    searchMode === "announcements"
                      ? "grid min-h-0 *:min-h-0"
                      : "hidden"
                  }
                >
                  <AnnouncementWorkspace
                    isActive={searchMode === "announcements"}
                  />
                </div>
              ) : null}
            </Suspense>
          </div>
        </div>
        <DashboardResizeHandle
          label={
            focusedWorkspace
              ? "Resize workspace and display columns"
              : "Resize scripture queue and display columns"
          }
          onPointerDown={(event) =>
            startColumnResize(focusedWorkspace ? 1 : 2, event, focusedWorkspace)
          }
          onNudge={(amount) =>
            nudgeColumn(focusedWorkspace ? 1 : 2, amount, focusedWorkspace)
          }
        />

        <div className="flex h-full min-h-0 [scrollbar-width:thin] flex-col items-stretch overflow-y-auto overscroll-contain bg-background *:min-h-0 [&>*+*]:border-t-4 [&>*+*]:border-background">
          <div
            role="group"
            aria-label="Live and preview"
            className="flex shrink-0 flex-col gap-3 overflow-hidden bg-card p-3"
          >
            <LiveOutputPanel
              mode={searchMode}
              overlayActionPending={overlayActionPending}
            />
            <PreviewPanel
              mode={searchMode}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              overlayActionPending={overlayActionPending}
              onOverlayActionPendingChange={setOverlayActionPending}
            />
          </div>
          <OutputsMultiviewPanel mode={searchMode} />
          {searchMode !== "presentation" && searchMode !== "on-display" ? (
            <ThemesPanel mode={searchMode} />
          ) : null}
          {SHOW_MOTION_PANEL && searchMode !== "on-display" ? (
            <MotionPanel mode={searchMode} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
