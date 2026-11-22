const dirtyStores = new Set<() => Promise<void>>()

export async function flushPendingStoreWrites(): Promise<void> {
  while (dirtyStores.size) {
    await Promise.all(Array.from(dirtyStores, (flush) => flush()))
  }
}

// Serialize disk writes and keep a failed revision dirty for an operator retry.
export function debouncedSave(
  persist: () => Promise<void>,
  report: (error: unknown) => void,
  delay = 500
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let revision = 0
  let saved = 0
  let pending: Promise<void> | null = null

  async function flush(): Promise<void> {
    while (saved !== revision) {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (!pending) {
        const writing = revision
        pending = Promise.resolve()
          .then(persist)
          .then(() => {
            saved = writing
          })
          .finally(() => {
            pending = null
          })
      }
      await pending
    }
    dirtyStores.delete(flush)
  }

  function schedule() {
    dirtyStores.add(flush)
    revision++
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      void flush().catch(report)
    }, delay)
  }
  return { schedule, flush }
}
