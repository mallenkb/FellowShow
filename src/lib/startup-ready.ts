let startupReady: Promise<void> = Promise.resolve()

export function setStartupReady(ready: Promise<void>): void {
  startupReady = ready
}

export function waitForStartup(): Promise<void> {
  return startupReady
}
