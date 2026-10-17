import { create } from "zustand"
import { invoke } from "@/lib/ipc"

interface RemoteStatus {
  running: boolean
  port: number | null
}

interface CommandLogEntry {
  id: number
  timestamp: string
  source: "OSC" | "HTTP"
  command: string
}

interface RemoteControlState {
  oscPort: string
  httpPort: string
  oscStatus: RemoteStatus
  httpStatus: RemoteStatus
  oscStatusKnown: boolean
  httpStatusKnown: boolean
  oscError: string | null
  httpError: string | null
  oscPending: boolean
  httpPending: boolean
  commandLog: CommandLogEntry[]
  nextLogId: number
}

/** Session state survives settings navigation; the native listeners keep running. */
export const useRemoteControlStore = create<RemoteControlState>(() => ({
  oscPort: "8000",
  httpPort: "8080",
  oscStatus: { running: false, port: null },
  httpStatus: { running: false, port: null },
  oscStatusKnown: false,
  httpStatusKnown: false,
  oscError: null,
  httpError: null,
  oscPending: false,
  httpPending: false,
  commandLog: [],
  nextLogId: 0,
}))

export function recordRemoteCommand(payload: unknown): void {
  if (typeof payload !== "object" || payload === null) return
  if (!("source" in payload) || !("command" in payload)) return
  if (payload.source !== "OSC" && payload.source !== "HTTP") return
  if (typeof payload.command !== "string") return
  const source = payload.source
  const command = payload.command
  useRemoteControlStore.setState((state) => {
    const entry: CommandLogEntry = {
      id: state.nextLogId,
      timestamp: new Date().toLocaleTimeString(),
      source,
      command,
    }
    return {
      nextLogId: state.nextLogId + 1,
      commandLog: [entry, ...state.commandLog].slice(0, 50),
    }
  })
}

export async function refreshRemoteControlStatus(): Promise<void> {
  await Promise.all([
    invoke("get_osc_status")
      .then((oscStatus) => {
        useRemoteControlStore.setState((state) => ({
          oscStatus,
          oscStatusKnown: true,
          oscPort:
            oscStatus.running && oscStatus.port !== null
              ? String(oscStatus.port)
              : state.oscPort,
          oscError: null,
        }))
      })
      .catch((error: unknown) => {
        useRemoteControlStore.setState({ oscError: String(error) })
      }),
    invoke("get_http_status")
      .then((httpStatus) => {
        useRemoteControlStore.setState((state) => ({
          httpStatus,
          httpStatusKnown: true,
          httpPort:
            httpStatus.running && httpStatus.port !== null
              ? String(httpStatus.port)
              : state.httpPort,
          httpError: null,
        }))
      })
      .catch((error: unknown) => {
        useRemoteControlStore.setState({ httpError: String(error) })
      }),
  ])
}
