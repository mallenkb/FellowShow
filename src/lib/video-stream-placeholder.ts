interface VideoStreamPlaceholderOptions {
  scale?: number
  offsetX?: number
  offsetY?: number
}

export function drawVideoStreamPlaceholder(
  ctx: CanvasRenderingContext2D,
  resolution: { width: number; height: number },
  options: VideoStreamPlaceholderOptions = {}
): void {
  const scale = options.scale ?? 1
  const x = options.offsetX ?? 0
  const y = options.offsetY ?? 0
  const width = resolution.width * scale
  const height = resolution.height * scale
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height)
  gradient.addColorStop(0, "#172033")
  gradient.addColorStop(0.55, "#0b1220")
  gradient.addColorStop(1, "#111827")

  ctx.save()
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, width, height)

  ctx.globalAlpha = 0.16
  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth = Math.max(1, 2 * scale)
  const spacing = 72 * scale
  for (let lineX = x - height; lineX < x + width; lineX += spacing) {
    ctx.beginPath()
    ctx.moveTo(lineX, y + height)
    ctx.lineTo(lineX + height, y)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#e2e8f0"
  ctx.font = `600 ${Math.max(18, 42 * scale)}px Inter, sans-serif`
  ctx.fillText("VIDEO STREAM", x + width / 2, y + height / 2)
  ctx.fillStyle = "#94a3b8"
  ctx.font = `500 ${Math.max(11, 18 * scale)}px Inter, sans-serif`
  ctx.fillText(
    "Live video input preview",
    x + width / 2,
    y + height / 2 + 42 * scale
  )
  ctx.restore()
}
