// Paths and asset URLs can use different separators and percent encoding on
// each platform. A UUID match is sufficient to retain a file on any of them.
const uuid =
  /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi
export const cacheFileName = new RegExp(
  `^${uuid.source}(?:\\.[a-z0-9]+)?$`,
  "i"
)

// Batch imports and editor-local drafts may outlive the on-disk grace period.
// A presentation removal releases its copies. Other drafts expire on restart.
const sessionImports = new Set<string>()

export function allocateMediaFileName(source: string) {
  const id = crypto.randomUUID()
  const extension = /\.([a-z0-9]+)$/i.exec(source)?.[1]?.toLowerCase()
  sessionImports.add(id)
  return extension ? `${id}.${extension}` : id
}

export function isSessionImport(name: string) {
  return sessionImports.has(name.slice(0, 36).toLowerCase())
}

export function visitMediaReferences(
  value: unknown,
  visit: (id: string) => void
) {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return
    // Decode escaped letters too (a URL imported from a theme JSON, for example).
    const decoded = value.replace(/%([\da-f]{2})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    for (const match of decoded.matchAll(uuid)) visit(match[0].toLowerCase())
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value)) visitMediaReferences(child, visit)
  }
}

export function releaseRemovedMedia(value: unknown) {
  visitMediaReferences(value, (id) => sessionImports.delete(id))
}
