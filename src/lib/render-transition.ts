import type { BroadcastTheme } from "@/types/broadcast"

function applyTransitionEasing(
  progress: number,
  easing: BroadcastTheme["transition"]["easing"]
): number {
  const t = Math.max(0, Math.min(1, progress))
  switch (easing) {
    case "linear":
      return t
    case "ease-in":
      return t * t
    case "ease-out":
      return 1 - (1 - t) * (1 - t)
    case "ease-in-out":
    default:
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }
}

export function drawTransitionFrame(
  ctx: CanvasRenderingContext2D,
  previous: HTMLCanvasElement,
  next: HTMLCanvasElement,
  theme: BroadcastTheme,
  progress: number
): void {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const transition = theme.transition
  const eased = applyTransitionEasing(progress, transition.easing)

  ctx.clearRect(0, 0, width, height)

  if (transition.type === "none") {
    ctx.drawImage(next, 0, 0, width, height)
    return
  }

  if (transition.type === "fade") {
    ctx.save()
    ctx.globalAlpha = 1 - eased
    ctx.drawImage(previous, 0, 0, width, height)
    ctx.globalAlpha = eased
    ctx.drawImage(next, 0, 0, width, height)
    ctx.restore()
    return
  }

  ctx.drawImage(previous, 0, 0, width, height)

  ctx.save()
  ctx.globalAlpha = eased
  if (transition.type === "slide") {
    const distanceX =
      transition.direction === "left"
        ? width
        : transition.direction === "right"
          ? -width
          : 0
    const distanceY =
      transition.direction === "up"
        ? height
        : transition.direction === "down"
          ? -height
          : 0
    ctx.drawImage(
      next,
      distanceX * (1 - eased),
      distanceY * (1 - eased),
      width,
      height
    )
  } else {
    const scale = 0.96 + eased * 0.04
    const drawW = width * scale
    const drawH = height * scale
    ctx.drawImage(next, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)
  }
  ctx.restore()
}
