import { appIconPath } from "@/lib/app-icon"
import type { SermonSession } from "@/types"

export async function renderSermonCover(
  session: Pick<SermonSession, "title" | "series" | "speaker">
): Promise<number[]> {
  const canvas = document.createElement("canvas")
  const size = 1024
  const padding = 72
  const textWidth = size - padding * 2
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not create the sermon cover.")

  ctx.fillStyle = "#0a0a0a"
  ctx.fillRect(0, 0, size, size)
  for (const [x, y, color] of [
    [0, size, "#193b3d"],
    [size, 0, "#656023"],
  ] as const) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.9)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, "transparent")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }

  const logo = new Image()
  logo.src = appIconPath(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  )
  await logo.decode()
  const logoSize = 56
  ctx.drawImage(logo, padding, 92 - logoSize / 2, logoSize, logoSize)
  ctx.fillStyle = "#bfbfbf"
  ctx.font = "600 32px system-ui, sans-serif"
  ctx.textBaseline = "middle"
  ctx.fillText("FELLOWSHOW", padding + logoSize + 12, 92)

  ctx.textBaseline = "alphabetic"
  ctx.font = "700 76px system-ui, sans-serif"
  const title = (session.title.trim() || "Sermon").split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of title) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > textWidth && lines.length < 2) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  lines.push(line)
  const lastBaseline = size - padding - (session.speaker ? 54 : 0)
  const firstBaseline = lastBaseline - (lines.length - 1) * 84
  ctx.fillStyle = "#ffffff"
  lines.forEach((titleLine, index) =>
    ctx.fillText(titleLine, padding, firstBaseline + index * 84, textWidth)
  )
  ctx.fillStyle = "#f5e500"
  ctx.font = "600 30px system-ui, sans-serif"
  ctx.fillText(
    (session.series?.trim() || "Saved sermon").toLocaleUpperCase(),
    padding,
    firstBaseline - 94,
    textWidth
  )
  if (session.speaker) {
    ctx.fillStyle = "#bfbfbf"
    ctx.font = "400 34px system-ui, sans-serif"
    ctx.fillText(session.speaker, padding, size - padding, textWidth)
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((image) => {
      if (image) resolve(image)
      else reject(new Error("Could not save the sermon cover as a PNG."))
    }, "image/png")
  })
  return Array.from(new Uint8Array(await blob.arrayBuffer()))
}
