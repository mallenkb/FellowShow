import { invoke } from "@/lib/ipc"
import { useEffect } from "react"
import {
  refreshRemoteControlStatus,
  useRemoteControlStore,
} from "@/stores/remote-control-store"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { PortInput, StatusDot } from "./shared"

export function RemoteControlSection() {
  const {
    oscPort,
    httpPort,
    oscStatus,
    httpStatus,
    oscStatusKnown,
    httpStatusKnown,
    oscError,
    httpError,
    oscPending,
    httpPending,
    commandLog,
  } = useRemoteControlStore()

  // Poll statuses
  useEffect(() => {
    const pollStatuses = () =>
      void refreshRemoteControlStatus().catch(console.error)
    pollStatuses()
    const interval = setInterval(() => {
      pollStatuses()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleOscToggle = async () => {
    useRemoteControlStore.setState({ oscPending: true })
    try {
      if (oscStatus.running) {
        await invoke("stop_osc")
        useRemoteControlStore.setState({
          oscStatus: { running: false, port: null },
          oscError: null,
        })
      } else {
        const port = parseInt(oscPort) || 8000
        const boundPort = await invoke("start_osc", { port })
        useRemoteControlStore.setState({
          oscPort: String(boundPort),
          oscStatus: { running: true, port: boundPort },
          oscError: null,
        })
      }
    } catch (e) {
      useRemoteControlStore.setState({ oscError: String(e) })
    } finally {
      useRemoteControlStore.setState({ oscPending: false })
    }
  }

  const handleHttpToggle = async () => {
    useRemoteControlStore.setState({ httpPending: true })
    try {
      if (httpStatus.running) {
        await invoke("stop_http")
        useRemoteControlStore.setState({
          httpStatus: { running: false, port: null },
          httpError: null,
        })
      } else {
        const port = parseInt(httpPort) || 8080
        const boundPort = await invoke("start_http", { port })
        useRemoteControlStore.setState({
          httpPort: String(boundPort),
          httpStatus: { running: true, port: boundPort },
          httpError: null,
        })
      }
    } catch (e) {
      useRemoteControlStore.setState({ httpError: String(e) })
    } finally {
      useRemoteControlStore.setState({ httpPending: false })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* OSC */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          OSC (Open Sound Control)
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <label className="text-xs text-muted-foreground">Port</label>
            <PortInput
              value={oscPort}
              onChange={(oscPort) =>
                useRemoteControlStore.setState({ oscPort })
              }
              disabled={oscStatus.running || oscPending || !oscStatusKnown}
            />
          </div>
          {oscStatusKnown ? (
            <StatusDot running={oscStatus.running} />
          ) : (
            <span className="text-xs text-muted-foreground">Checking...</span>
          )}
          <Button
            size="sm"
            variant={oscStatus.running ? "destructive" : "default"}
            onClick={() => void handleOscToggle()}
            disabled={oscPending || !oscStatusKnown}
            className="text-xs"
          >
            {oscStatus.running ? "Stop" : "Start"}
          </Button>
        </div>
        {oscError && <p className="text-[0.625rem] text-red-500">{oscError}</p>}
        {oscStatus.running && oscStatus.port && (
          <p className="text-[0.625rem] text-muted-foreground">
            Listening on UDP port {oscStatus.port}
          </p>
        )}
        <p className="text-[0.625rem] text-muted-foreground">
          Receives OSC commands from controller software running on this
          computer, such as Companion or QLab.
        </p>
      </div>

      {/* HTTP API */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          HTTP API
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <label className="text-xs text-muted-foreground">Port</label>
            <PortInput
              value={httpPort}
              onChange={(httpPort) =>
                useRemoteControlStore.setState({ httpPort })
              }
              disabled={httpStatus.running || httpPending || !httpStatusKnown}
            />
          </div>
          {httpStatusKnown ? (
            <StatusDot running={httpStatus.running} />
          ) : (
            <span className="text-xs text-muted-foreground">Checking...</span>
          )}
          <Button
            size="sm"
            variant={httpStatus.running ? "destructive" : "default"}
            onClick={() => void handleHttpToggle()}
            disabled={httpPending || !httpStatusKnown}
            className="text-xs"
          >
            {httpStatus.running ? "Stop" : "Start"}
          </Button>
        </div>
        {httpError && (
          <p className="text-[0.625rem] text-red-500">{httpError}</p>
        )}
        {httpStatus.running && httpStatus.port && (
          <p className="text-[0.625rem] text-muted-foreground">
            Serving on http://localhost:{httpStatus.port}/api/v1/
          </p>
        )}
        <p className="text-[0.625rem] text-muted-foreground">
          Local REST API for status queries, automation scripts, and dashboards
          running on this computer.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-1 text-[0.625rem] font-medium text-muted-foreground">
          Local access only
        </p>
        <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
          Both listeners bind to 127.0.0.1. Phones, tablets, and other computers
          cannot connect. No firewall changes are needed.
        </p>
      </div>

      {/* Command Log */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Command Log
          </label>
          {commandLog.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[0.5rem]"
              onClick={() => useRemoteControlStore.setState({ commandLog: [] })}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="h-32 overflow-y-auto rounded-lg border border-border bg-background p-2">
          {commandLog.length === 0 ? (
            <p className="mt-8 text-center text-[0.625rem] text-muted-foreground">
              No commands received yet
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {commandLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 text-[0.625rem]"
                >
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {entry.timestamp}
                  </span>
                  <Badge variant="outline" className="h-3.5 px-1 text-[0.5rem]">
                    {entry.source}
                  </Badge>
                  <span className="font-mono text-foreground">
                    {entry.command}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Updates                                                          */
/* -------------------------------------------------------------------------- */
