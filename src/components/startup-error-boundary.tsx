import { Component, type ErrorInfo, type ReactNode } from "react"

function formatRenderError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ""}`
  }
  return String(error)
}

function StartupErrorPanel({ error }: { error: unknown }) {
  return (
    <main className="min-h-screen bg-neutral-950 p-8 font-sans text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          FellowShow could not render
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          The local app started, but React hit an error before the dashboard
          could appear.
        </p>
        <pre className="mt-6 max-h-[72vh] overflow-auto rounded-lg border border-neutral-700 bg-black p-4 text-xs leading-relaxed text-neutral-200">
          {formatRenderError(error)}
        </pre>
      </div>
    </main>
  )
}

export class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[startup] Failed to render FellowShow", error, info)
  }

  render() {
    if (this.state.error) {
      return <StartupErrorPanel error={this.state.error} />
    }

    return this.props.children
  }
}
