import { getLowerThirdOpacity } from "@/lib/overlays"
import { drawBarDesign } from "./bar-design-renderer"
import { drawTickerDesign } from "./ticker-design-renderer"
import { drawLowerThirdDesign } from "./lower-third-design-renderer"
import { isLowerThirdDesignStyle } from "@/types/lower-third-designs"
import {
  DEFAULT_LOWER_THIRD_STYLE,
  type BroadcastOverlayPayload,
  type LowerThirdStyle,
} from "@/types/overlays"

interface OverlayRenderOptions {
  /**
   * Keyer the output feeds. Graphics keep the operator's colors whatever the
   * keyer, so Preview matches what goes to air. On a luma key, anything dark
   * is lifted just above black so the keyer does not cut it out.
   */
  keyMode?: "dsk-luma" | "chroma-key"
  now?: number
  imageCache?: Map<string, HTMLImageElement>
  scale?: number
  offsetX?: number
  offsetY?: number
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, safeRadius)
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: BroadcastOverlayPayload,
  options: OverlayRenderOptions
): void {
  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  for (const logo of overlays.logos) {
    const image = options.imageCache?.get(logo.imageUrl)
    if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) continue
    const logoWidth = width * (logo.widthPercent / 100)
    const logoHeight = logoWidth * (image.naturalHeight / image.naturalWidth)
    const desiredX = offsetX + width * (logo.xPercent / 100) - logoWidth / 2
    const desiredY = offsetY + height * (logo.yPercent / 100) - logoHeight / 2
    const x = Math.min(offsetX + width - logoWidth, Math.max(offsetX, desiredX))
    const y = Math.min(
      offsetY + height - logoHeight,
      Math.max(offsetY, desiredY)
    )
    ctx.save()
    ctx.globalAlpha = 0.96
    ctx.drawImage(image, x, y, logoWidth, logoHeight)
    ctx.restore()
  }
}

function lowerThirdThemeAccent(
  theme: NonNullable<BroadcastOverlayPayload["lowerThird"]>["theme"]
): string {
  switch (theme) {
    case "notice":
      return "#f59e0b"
    case "speaker":
      return "#60a5fa"
    case "preacher":
    default:
      return "#2563eb"
  }
}

function lowerThirdInsets(
  style: LowerThirdStyle,
  scale: number
): { leading: number; trailing: number } {
  switch (style) {
    case "dark-avatar-blue":
      return { leading: 112 * scale, trailing: 0 }
    case "white-amber":
      return { leading: 0, trailing: 64 * scale }
    case "dark-green-dots":
      return { leading: 0, trailing: 120 * scale }
    case "white-purple-angles":
      return { leading: 108 * scale, trailing: 0 }
    case "dark-blue-diagonal":
      return { leading: 28 * scale, trailing: 100 * scale }
    case "full-width-banner":
      return { leading: 58 * scale, trailing: 178 * scale }
    case "white-blue":
    default:
      return { leading: 0, trailing: 0 }
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const naturalWidth = image.naturalWidth || 1
  const naturalHeight = image.naturalHeight || 1
  const imageRatio = naturalWidth / naturalHeight
  const rectRatio = width / height
  let sx = 0
  let sy = 0
  let sWidth = naturalWidth
  let sHeight = naturalHeight
  if (imageRatio > rectRatio) {
    sWidth = naturalHeight * rectRatio
    sx = (naturalWidth - sWidth) / 2
  } else {
    sHeight = naturalWidth / rectRatio
    sy = (naturalHeight - sHeight) / 2
  }
  ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, width, height)
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number
): void {
  const naturalWidth = image.naturalWidth || 1
  const naturalHeight = image.naturalHeight || 1
  const imageRatio = naturalWidth / naturalHeight
  const drawWidth = imageRatio >= 1 ? size : size * imageRatio
  const drawHeight = imageRatio >= 1 ? size / imageRatio : size
  ctx.drawImage(
    image,
    x + (size - drawWidth) / 2,
    y + (size - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

function drawLowerThirdLogoBadge(
  ctx: CanvasRenderingContext2D,
  lowerThird: NonNullable<BroadcastOverlayPayload["lowerThird"]>,
  boxX: number,
  boxY: number,
  boxWidth: number,
  scale: number,
  imageCache: Map<string, HTMLImageElement> | undefined
): void {
  const logoUrl = lowerThird.logoImageUrl
  if (!logoUrl) return
  const image = imageCache?.get(logoUrl)
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) return

  const logoSizeMultiplier = (lowerThird.logoSizePercent ?? 100) / 100
  const badgeSize = Math.max(20 * scale, 64 * scale * logoSizeMultiplier)
  const badgeGap = 10 * scale
  const isLeft = lowerThird.logoPosition === "left"
  const badgeX = isLeft
    ? boxX + badgeGap
    : boxX + boxWidth - badgeSize - badgeGap
  const badgeY = boxY - badgeSize - badgeGap * 0.6

  ctx.save()
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)"
  ctx.shadowBlur = 10 * scale
  ctx.shadowOffsetY = 3 * scale
  ctx.fillStyle = "rgba(255, 255, 255, 0.97)"
  roundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10 * scale)
  ctx.fill()
  ctx.shadowColor = "transparent"
  const innerPad = badgeSize * 0.14
  drawContainImage(
    ctx,
    image,
    badgeX + innerPad,
    badgeY + innerPad,
    badgeSize - innerPad * 2
  )
  ctx.restore()
}

function drawAvatarSilhouette(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number
): void {
  ctx.save()
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)"
  ctx.beginPath()
  ctx.arc(centerX, centerY - 15 * scale, 15 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX, centerY + 48 * scale, 30 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function clippedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }
  let clipped = text
  while (
    clipped.length > 0 &&
    ctx.measureText(`${clipped}…`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1)
  }
  ctx.fillText(`${clipped}…`, x, y)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxCharactersPerLine: number
): string[] {
  const lines: string[] = []
  const paragraphs = text.trim().replace(/\r/g, "").split("\n")

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    let line = ""

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (
        candidate.length <= maxCharactersPerLine &&
        ctx.measureText(candidate).width <= maxWidth
      ) {
        line = candidate
        continue
      }

      if (line) {
        lines.push(line)
      }

      let remainder = word
      while (
        remainder &&
        (remainder.length > maxCharactersPerLine ||
          ctx.measureText(remainder).width > maxWidth)
      ) {
        let splitAt = 1
        while (
          splitAt < remainder.length &&
          splitAt < maxCharactersPerLine &&
          ctx.measureText(remainder.slice(0, splitAt + 1)).width <= maxWidth
        ) {
          splitAt += 1
        }
        lines.push(remainder.slice(0, splitAt))
        remainder = remainder.slice(splitAt)
      }
      line = remainder
    }

    if (line) lines.push(line)
  }

  if (lines.length <= maxLines) return lines
  const visibleLines = lines.slice(0, maxLines)
  let lastLine = visibleLines[maxLines - 1] ?? ""
  while (
    lastLine.length > 0 &&
    ctx.measureText(`${lastLine}…`).width > maxWidth
  ) {
    lastLine = lastLine.slice(0, -1)
  }
  visibleLines[maxLines - 1] = `${lastLine.trimEnd()}…`
  return visibleLines
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number
): void {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
}

const LOGO_REVEAL_ACCENTS: Partial<Record<LowerThirdStyle, string>> = {
  "logo-reveal-midnight": "#e9b949",
  "logo-reveal-ivory": "#166534",
  "logo-reveal-slate": "#2dd4bf",
}

function isLogoRevealStyle(style: LowerThirdStyle): boolean {
  return style in LOGO_REVEAL_ACCENTS
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)

function initialsFor(title: string): string {
  return title
    .split(/\s+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
    .slice(-2)
    .map((word) => word[0]?.toLocaleUpperCase() ?? "")
    .join("")
}

/**
 * A large logo with the text bar sliding out from behind it. The bar is
 * revealed through a clipping mask that grows from the logo's centre, so it
 * always looks attached to the logo.
 */
function drawLogoRevealLowerThird(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lowerThird: NonNullable<BroadcastOverlayPayload["lowerThird"]>,
  options: OverlayRenderOptions,
  scale: number,
  style: LowerThirdStyle
): void {
  const now = options.now ?? Date.now()
  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  const enter = clamp01((now - lowerThird.startedAt) / 900)
  const exit = clamp01(
    (lowerThird.startedAt + lowerThird.durationMs - now) / 700
  )
  const progress = Math.min(enter, exit)
  if (progress <= 0) return
  const logoProgress = easeOutCubic(clamp01(progress / 0.35))
  const barProgress = easeOutCubic(clamp01((progress - 0.25) / 0.55))
  const textProgress = easeOutCubic(clamp01((progress - 0.55) / 0.45))

  const square = style === "logo-reveal-slate"
  const accent =
    lowerThird.accentColor ?? LOGO_REVEAL_ACCENTS[style] ?? "#e9b949"
  const logoSize = 168 * scale * ((lowerThird.logoSizePercent ?? 100) / 100)
  const barHeight = logoSize * 0.66
  const padX = 34 * scale
  const titleSize = 44 * scale
  const subtitleSize = 24 * scale
  const labelSize = 15 * scale
  const hasLabel = Boolean(lowerThird.label?.trim())
  const hasSubtitle = Boolean(lowerThird.subtitle?.trim())
  const maximumBar = Math.max(
    logoSize,
    Math.min(width * (lowerThird.widthPercent / 100), width * 0.9) -
      logoSize / 2
  )
  const maximumText = Math.max(1, maximumBar - logoSize / 2 - padX * 2)

  ctx.save()
  ctx.font = `700 ${titleSize}px "Inter Variable", sans-serif`
  const title = wrapText(ctx, lowerThird.title, maximumText, 1, 80)[0] ?? ""
  const titleWidth = ctx.measureText(title).width
  ctx.font = `500 ${subtitleSize}px "Inter Variable", sans-serif`
  const subtitle = hasSubtitle
    ? (wrapText(ctx, lowerThird.subtitle ?? "", maximumText, 1, 100)[0] ?? "")
    : ""
  const subtitleWidth = subtitle ? ctx.measureText(subtitle).width : 0
  ctx.font = `700 ${labelSize}px "Inter Variable", sans-serif`
  const label = hasLabel ? (lowerThird.label ?? "").trim().toUpperCase() : ""
  const labelWidth = label ? ctx.measureText(label).width * 1.15 : 0
  ctx.restore()

  const textWidth = Math.max(titleWidth, subtitleWidth, labelWidth)
  const barWidth = Math.min(
    maximumBar,
    logoSize / 2 + padX + textWidth + padX * (square ? 2.2 : 1.6)
  )
  const totalWidth = logoSize / 2 + barWidth
  const centerX = offsetX + width * (lowerThird.xPercent / 100)
  const centerY = offsetY + height * (lowerThird.yPercent / 100)
  const left = Math.min(
    offsetX + width - totalWidth,
    Math.max(offsetX, centerX - totalWidth / 2)
  )
  const middleY = Math.min(
    offsetY + height - logoSize / 2,
    Math.max(offsetY + logoSize / 2, centerY)
  )
  const logoX = left + logoSize / 2
  const barY = middleY - barHeight / 2
  const angle = square ? barHeight * 0.35 : 0

  ctx.save()
  ctx.globalAlpha = clamp01(progress * 3)

  if (barProgress > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(
      logoX,
      barY - 30 * scale,
      barWidth * barProgress,
      barHeight + 60 * scale
    )
    ctx.clip()
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)"
    ctx.shadowBlur = 26 * scale
    ctx.shadowOffsetY = 6 * scale
    ctx.fillStyle = lowerThird.backgroundColor
    if (square) {
      ctx.beginPath()
      ctx.moveTo(logoX, barY)
      ctx.lineTo(logoX + barWidth, barY)
      ctx.lineTo(logoX + barWidth - angle, barY + barHeight)
      ctx.lineTo(logoX, barY + barHeight)
      ctx.closePath()
    } else {
      roundedRect(ctx, logoX, barY, barWidth, barHeight, barHeight / 2)
    }
    ctx.fill()
    ctx.shadowColor = "transparent"
    ctx.fillStyle = accent
    ctx.fillRect(
      logoX,
      barY + barHeight - 5 * scale,
      barWidth - (square ? angle : barHeight / 2),
      5 * scale
    )

    const lineCount = 1 + (subtitle ? 1 : 0) + (label ? 1 : 0)
    const blockHeight =
      titleSize * 1.1 +
      (subtitle ? subtitleSize * 1.35 : 0) +
      (label ? labelSize * 1.6 : 0)
    let textY = middleY - blockHeight / 2 - (lineCount > 2 ? 2 * scale : 0)
    const textX = logoX + logoSize / 2 + padX - (1 - textProgress) * 26 * scale
    ctx.globalAlpha *= textProgress
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    if (label) {
      ctx.fillStyle = accent
      ctx.font = `700 ${labelSize}px "Inter Variable", sans-serif`
      ctx.letterSpacing = `${2 * scale}px`
      ctx.fillText(label, textX, textY)
      ctx.letterSpacing = "0px"
      textY += labelSize * 1.6
    }
    ctx.fillStyle = lowerThird.textColor
    ctx.font = `700 ${titleSize}px "Inter Variable", sans-serif`
    ctx.fillText(title, textX, textY)
    textY += titleSize * 1.1
    if (subtitle) {
      ctx.globalAlpha *= 0.78
      ctx.font = `500 ${subtitleSize}px "Inter Variable", sans-serif`
      ctx.fillText(subtitle, textX, textY + subtitleSize * 0.2)
    }
    ctx.restore()
  }

  // The logo sits on top, hiding where the bar starts.
  const size = logoSize * (0.6 + 0.4 * logoProgress)
  const logoLeft = logoX - size / 2
  const logoTop = middleY - size / 2
  const ring = 6 * scale
  const corner = square ? size * 0.22 : size / 2
  ctx.save()
  ctx.globalAlpha *= logoProgress
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)"
  ctx.shadowBlur = 28 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.fillStyle = accent
  roundedRect(ctx, logoLeft, logoTop, size, size, corner)
  ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.fillStyle = "#ffffff"
  roundedRect(
    ctx,
    logoLeft + ring,
    logoTop + ring,
    size - ring * 2,
    size - ring * 2,
    Math.max(0, corner - ring)
  )
  ctx.fill()
  const image = lowerThird.logoImageUrl
    ? options.imageCache?.get(lowerThird.logoImageUrl)
    : undefined
  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    ctx.clip()
    const inset = size * 0.16
    drawContainImage(
      ctx,
      image,
      logoLeft + inset,
      logoTop + inset,
      size - inset * 2
    )
  } else {
    ctx.fillStyle = lowerThird.backgroundColor
    ctx.font = `800 ${size * 0.34}px "Inter Variable", sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(initialsFor(lowerThird.title), logoX, middleY + size * 0.02)
  }
  ctx.restore()
  ctx.restore()
}

function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: BroadcastOverlayPayload,
  options: OverlayRenderOptions
): void {
  const lowerThird = overlays.lowerThird
  if (!lowerThird) return
  const opacity = getLowerThirdOpacity(lowerThird, options.now ?? Date.now())
  if (opacity <= 0) return

  const sizeMultiplier = (lowerThird.sizePercent ?? 100) / 100
  const scale = (options.scale ?? 1) * sizeMultiplier
  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  const style = lowerThird.style ?? DEFAULT_LOWER_THIRD_STYLE
  if (isLowerThirdDesignStyle(style)) {
    drawLowerThirdDesign(ctx, width, height, lowerThird, style, options)
    return
  }
  if (isLogoRevealStyle(style)) {
    drawLogoRevealLowerThird(
      ctx,
      width,
      height,
      lowerThird,
      options,
      scale,
      style
    )
    return
  }
  const fullWidth = style === "full-width-banner"
  const safeBoundaryWidth = width * (fullWidth ? 1 : 0.9)
  const configuredMaximumWidth = width * (lowerThird.widthPercent / 100)
  const maximumBoxWidth = fullWidth
    ? safeBoundaryWidth
    : lowerThird.maxWidthEnabled === false
      ? safeBoundaryWidth
      : Math.min(configuredMaximumWidth, safeBoundaryWidth)
  const hasLabel = Boolean(lowerThird.label?.trim())
  const hasSubtitle = Boolean(lowerThird.subtitle?.trim())
  const paddingX = (fullWidth ? 46 : 36) * scale
  const { leading, trailing } = lowerThirdInsets(style, scale)
  const maximumContentWidth = Math.max(
    1,
    maximumBoxWidth - paddingX * 2 - leading - trailing
  )
  const labelLineHeight = 21 * scale
  const titleFontSize = (fullWidth ? 46 : 42) * scale
  const titleLineHeight = (fullWidth ? 52 : 48) * scale
  const subtitleLineHeight = (fullWidth ? 31 : 30) * scale

  ctx.save()
  ctx.font = `700 ${titleFontSize}px "Inter Variable", sans-serif`
  const titleLines = wrapText(
    ctx,
    lowerThird.title,
    maximumContentWidth,
    2,
    fullWidth ? 48 : 32
  )
  const titleWidth = Math.max(
    0,
    ...titleLines.map((line) => ctx.measureText(line).width)
  )
  ctx.font = `500 ${24 * scale}px "Inter Variable", sans-serif`
  const subtitleLines = hasSubtitle
    ? wrapText(
        ctx,
        lowerThird.subtitle ?? "",
        maximumContentWidth,
        2,
        fullWidth ? 64 : 48
      )
    : []
  const subtitleWidth = Math.max(
    0,
    ...subtitleLines.map((line) => ctx.measureText(line).width)
  )
  ctx.font = `700 ${16 * scale}px "Inter Variable", sans-serif`
  const labelWidth = hasLabel
    ? ctx.measureText(lowerThird.label?.toUpperCase() ?? "").width
    : 0
  ctx.restore()

  const fittedContentWidth = Math.max(titleWidth, subtitleWidth, labelWidth)
  // The saved width is an upper bound: short lower thirds hug their content,
  // while longer copy expands only until that cap and wraps within it.
  const naturalBoxWidth = fittedContentWidth + paddingX * 2 + leading + trailing
  const boxWidth = fullWidth
    ? maximumBoxWidth
    : Math.min(maximumBoxWidth, naturalBoxWidth)
  const maxWidth = Math.max(1, boxWidth - paddingX * 2 - leading - trailing)

  const contentHeight =
    (fullWidth ? 26 : 22) * scale +
    (hasLabel ? labelLineHeight + 8 * scale : 0) +
    titleLines.length * titleLineHeight +
    (subtitleLines.length > 0
      ? 4 * scale + subtitleLines.length * subtitleLineHeight
      : 0) +
    (fullWidth ? 26 : 20) * scale
  const boxHeight = Math.max(
    fullWidth ? 174 * scale : 112 * scale,
    contentHeight
  )
  const desiredX = fullWidth
    ? offsetX
    : offsetX + width * (lowerThird.xPercent / 100) - boxWidth / 2
  const desiredY = fullWidth
    ? offsetY + height - boxHeight
    : offsetY + height * (lowerThird.yPercent / 100) - boxHeight / 2
  const x = fullWidth
    ? offsetX
    : Math.min(offsetX + width - boxWidth, Math.max(offsetX, desiredX))
  const y = fullWidth
    ? Math.max(offsetY, desiredY)
    : Math.min(offsetY + height - boxHeight, Math.max(offsetY, desiredY))
  const themeAccent = lowerThirdThemeAccent(lowerThird.theme)
  const styleDefaultAccent =
    style === "white-amber"
      ? "#f59e0b"
      : style === "dark-green-dots"
        ? "#22c55e"
        : style === "white-purple-angles"
          ? "#7c3aed"
          : style === "dark-blue-diagonal" || style === "full-width-banner"
            ? "#2563eb"
            : style === "dark-avatar-blue"
              ? "#1d4ed8"
              : themeAccent
  const accent = lowerThird.accentColor || styleDefaultAccent

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.shadowColor = fullWidth ? "transparent" : "rgba(0, 0, 0, 0.38)"
  ctx.shadowBlur = (fullWidth ? 0 : 20) * scale
  ctx.shadowOffsetY = (fullWidth ? 0 : 8) * scale
  ctx.fillStyle = lowerThird.backgroundColor
  if (fullWidth) {
    ctx.fillRect(x, y, boxWidth, boxHeight)
  } else {
    roundedRect(ctx, x, y, boxWidth, boxHeight, 12 * scale)
    ctx.fill()
  }
  ctx.shadowColor = "transparent"
  ctx.save()
  if (fullWidth) {
    ctx.beginPath()
    ctx.rect(x, y, boxWidth, boxHeight)
  } else {
    roundedRect(ctx, x, y, boxWidth, boxHeight, 12 * scale)
  }
  ctx.clip()
  if (style === "full-width-banner") {
    const gradient = ctx.createLinearGradient(x, y, x + boxWidth, y + boxHeight)
    gradient.addColorStop(0, lowerThird.backgroundColor)
    gradient.addColorStop(0.58, "#0b2457")
    gradient.addColorStop(1, "#102f72")
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, boxWidth, boxHeight)

    ctx.fillStyle = "rgba(37, 99, 235, 0.26)"
    ctx.beginPath()
    ctx.arc(
      x + boxWidth * 0.72,
      y + boxHeight * 0.44,
      boxHeight * 0.92,
      0,
      Math.PI * 2
    )
    ctx.fill()
    ctx.fillStyle = "rgba(96, 165, 250, 0.18)"
    ctx.beginPath()
    ctx.moveTo(x + boxWidth * 0.46, y + boxHeight)
    ctx.lineTo(x + boxWidth * 0.8, y)
    ctx.lineTo(x + boxWidth, y)
    ctx.lineTo(x + boxWidth * 0.64, y + boxHeight)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "rgba(147, 197, 253, 0.4)"
    ctx.lineWidth = 2 * scale
    ctx.beginPath()
    ctx.arc(
      x + boxWidth - 90 * scale,
      y + boxHeight / 2,
      48 * scale,
      0,
      Math.PI * 2
    )
    ctx.stroke()
    ctx.fillStyle = "rgba(96, 165, 250, 0.32)"
    ctx.beginPath()
    ctx.arc(
      x + boxWidth - 90 * scale,
      y + boxHeight / 2,
      31 * scale,
      0,
      Math.PI * 2
    )
    ctx.fill()
  } else {
    switch (style) {
      case "white-blue": {
        ctx.fillStyle = accent
        ctx.fillRect(x, y, 9 * scale, boxHeight)
        const cut = Math.min(46 * scale, boxHeight * 0.4)
        ctx.beginPath()
        ctx.moveTo(x + boxWidth, y + boxHeight - cut)
        ctx.lineTo(x + boxWidth, y + boxHeight)
        ctx.lineTo(x + boxWidth - cut, y + boxHeight)
        ctx.closePath()
        ctx.fill()
        break
      }
      case "dark-avatar-blue": {
        const avatarWidth = 96 * scale
        ctx.fillStyle = accent
        ctx.fillRect(x, y, avatarWidth, boxHeight)
        ctx.fillStyle = "#38bdf8"
        ctx.fillRect(x + avatarWidth - 4 * scale, y, 4 * scale, boxHeight)
        const avatarImage = lowerThird.avatarImageUrl
          ? options.imageCache?.get(lowerThird.avatarImageUrl)
          : undefined
        if (
          avatarImage &&
          avatarImage.naturalWidth > 0 &&
          avatarImage.naturalHeight > 0
        ) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, avatarWidth, boxHeight)
          ctx.clip()
          drawCoverImage(ctx, avatarImage, x, y, avatarWidth, boxHeight)
          ctx.restore()
        } else {
          drawAvatarSilhouette(
            ctx,
            x + avatarWidth / 2,
            y + boxHeight / 2,
            scale
          )
        }
        const cut = Math.min(30 * scale, boxHeight * 0.28)
        ctx.strokeStyle = "rgba(96, 165, 250, 0.55)"
        ctx.lineWidth = 2.5 * scale
        ctx.beginPath()
        ctx.moveTo(x + boxWidth - cut * 1.6, y + boxHeight)
        ctx.lineTo(x + boxWidth - cut * 0.4, y + boxHeight - cut)
        ctx.stroke()
        break
      }
      case "white-amber": {
        ctx.fillStyle = accent
        ctx.fillRect(x, y, 9 * scale, boxHeight)
        ctx.beginPath()
        ctx.moveTo(x + boxWidth * 0.74, y)
        ctx.lineTo(x + boxWidth, y)
        ctx.lineTo(x + boxWidth, y + boxHeight)
        ctx.lineTo(x + boxWidth * 0.64, y + boxHeight)
        ctx.closePath()
        ctx.fill()
        break
      }
      case "dark-green-dots": {
        ctx.fillStyle = accent
        ctx.fillRect(x, y, 9 * scale, boxHeight)
        const dotAreaX = x + boxWidth * 0.58
        const dotAreaWidth = Math.max(0, x + boxWidth - 12 * scale - dotAreaX)
        const spacing = 15 * scale
        const cols = Math.max(1, Math.floor(dotAreaWidth / spacing))
        const rows = Math.max(1, Math.floor(boxHeight / spacing))
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const fraction = cols > 1 ? col / (cols - 1) : 1
            const px =
              dotAreaX + col * spacing + (row % 2 === 0 ? 0 : spacing / 2)
            const py = y + spacing * 0.6 + row * spacing
            if (px > x + boxWidth - 6 * scale || py > y + boxHeight - 4 * scale)
              continue
            const radius = (1 + fraction * 2.2) * scale
            ctx.fillStyle = `rgba(134, 239, 172, ${(0.12 + fraction * 0.58).toFixed(3)})`
            ctx.beginPath()
            ctx.arc(px, py, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        break
      }
      case "white-purple-angles": {
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + boxWidth * 0.2, y)
        ctx.lineTo(x + boxWidth * 0.12, y + boxHeight)
        ctx.lineTo(x, y + boxHeight)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = "#8b5cf6"
        ctx.fillRect(x, y + boxHeight - 5 * scale, boxWidth, 5 * scale)
        break
      }
      case "dark-blue-diagonal":
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(x + 12 * scale, y, 4 * scale, boxHeight)
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(x + boxWidth - 124 * scale, y + boxHeight)
        ctx.lineTo(x + boxWidth - 62 * scale, y)
        ctx.lineTo(x + boxWidth - 32 * scale, y)
        ctx.lineTo(x + boxWidth - 94 * scale, y + boxHeight)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = "#60a5fa"
        ctx.beginPath()
        ctx.moveTo(x + boxWidth - 70 * scale, y + boxHeight)
        ctx.lineTo(x + boxWidth - 12 * scale, y)
        ctx.lineTo(x + boxWidth, y)
        ctx.lineTo(x + boxWidth - 58 * scale, y + boxHeight)
        ctx.closePath()
        ctx.fill()
        break
    }
  }
  ctx.restore()

  let textY = y + (fullWidth ? 26 : 22) * scale
  const textX = x + paddingX + leading
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  if (hasLabel) {
    ctx.fillStyle = lowerThird.textColor
    ctx.font = `700 ${16 * scale}px "Inter Variable", sans-serif`
    clippedText(
      ctx,
      lowerThird.label?.toUpperCase() ?? "",
      textX,
      textY,
      maxWidth
    )
    textY += labelLineHeight + 8 * scale
  }
  ctx.fillStyle = lowerThird.textColor
  ctx.font = `700 ${titleFontSize}px "Inter Variable", sans-serif`
  drawTextLines(ctx, titleLines, textX, textY, titleLineHeight)
  textY += titleLines.length * titleLineHeight
  if (hasSubtitle) {
    textY += 4 * scale
    ctx.fillStyle = lowerThird.textColor
    ctx.font = `500 ${24 * scale}px "Inter Variable", sans-serif`
    drawTextLines(ctx, subtitleLines, textX, textY, subtitleLineHeight)
  }
  drawLowerThirdLogoBadge(
    ctx,
    lowerThird,
    x,
    y,
    boxWidth,
    scale,
    options.imageCache
  )
  ctx.restore()
}

/** Draws master overlays in z-order: logo, lower third, bar, ticker. */
/**
 * The darkest any part of a graphic may be on a luma-keyed output. A luma key
 * treats black as see-through, so dark text or a dark bar would show the video
 * behind it. 40% grey stays fully solid on a keyer left at its usual defaults
 * (GoStream Duet: Clip 15%, Gain 50%), so no switcher settings need changing.
 */
const LUMA_KEY_FLOOR = "#666666"

interface LumaLayers {
  graphics: CanvasRenderingContext2D
  floor: CanvasRenderingContext2D
}

const lumaLayersByCanvas = new WeakMap<object, LumaLayers>()

/** Two scratch canvases the size of the output, reused every frame. */
function lumaLayersFor(ctx: CanvasRenderingContext2D): LumaLayers | null {
  const canvas = ctx.canvas as HTMLCanvasElement | undefined
  const owner = canvas?.ownerDocument
  if (!canvas?.width || !canvas.height || !owner || !ctx.getTransform) {
    return null
  }
  let layers = lumaLayersByCanvas.get(canvas)
  if (!layers) {
    const graphics = owner.createElement("canvas").getContext("2d")
    const floor = owner.createElement("canvas").getContext("2d")
    if (!graphics || !floor) return null
    layers = { graphics, floor }
    lumaLayersByCanvas.set(canvas, layers)
  }
  for (const layer of [layers.graphics, layers.floor]) {
    if (layer.canvas.width !== canvas.width) layer.canvas.width = canvas.width
    if (layer.canvas.height !== canvas.height) {
      layer.canvas.height = canvas.height
    }
  }
  return layers
}

/**
 * Raises every dark pixel of the graphics to at least the luma floor while
 * keeping its hue: dark navy becomes a brighter navy, not grey. Bright
 * colors are unchanged.
 */
function liftForLumaKey(layers: LumaLayers): void {
  const { graphics, floor } = layers
  const { width, height } = graphics.canvas
  floor.setTransform(1, 0, 0, 1, 0, 0)
  // The graphics, recolored to the floor brightness in their own hues.
  floor.globalCompositeOperation = "copy"
  floor.drawImage(graphics.canvas, 0, 0)
  floor.globalCompositeOperation = "luminosity"
  floor.fillStyle = LUMA_KEY_FLOOR
  floor.fillRect(0, 0, width, height)
  // Keep only the graphics' own shape (soft edges included).
  floor.globalCompositeOperation = "destination-in"
  floor.drawImage(graphics.canvas, 0, 0)
  floor.globalCompositeOperation = "source-over"
  // "lighten" keeps the brighter of the two in each channel, so only pixels
  // darker than the floor change.
  graphics.setTransform(1, 0, 0, 1, 0, 0)
  graphics.globalCompositeOperation = "lighten"
  graphics.drawImage(floor.canvas, 0, 0)
  graphics.globalCompositeOperation = "source-over"
}

export function drawBroadcastOverlays(
  ctx: CanvasRenderingContext2D,
  resolution: { width: number; height: number },
  overlays: BroadcastOverlayPayload | null | undefined,
  options: OverlayRenderOptions = {}
): void {
  if (!overlays) return
  const layers = options.keyMode === "dsk-luma" ? lumaLayersFor(ctx) : null
  if (layers) {
    const { graphics } = layers
    graphics.setTransform(1, 0, 0, 1, 0, 0)
    graphics.clearRect(0, 0, graphics.canvas.width, graphics.canvas.height)
    graphics.setTransform(ctx.getTransform())
    drawGraphics(graphics, resolution, overlays, options)
    liftForLumaKey(layers)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(graphics.canvas, 0, 0)
    ctx.restore()
    return
  }
  drawGraphics(ctx, resolution, overlays, options)
}

function drawGraphics(
  ctx: CanvasRenderingContext2D,
  resolution: { width: number; height: number },
  overlays: BroadcastOverlayPayload,
  options: OverlayRenderOptions
): void {
  const scale = options.scale ?? 1
  const width = resolution.width * scale
  const height = resolution.height * scale
  drawLogo(ctx, width, height, overlays, options)
  drawLowerThird(ctx, width, height, overlays, options)
  if (overlays.bar) {
    drawBarDesign(ctx, width, height, overlays.bar, options)
  }
  if (overlays.ticker) {
    drawTickerDesign(ctx, width, height, overlays.ticker, options)
  }
}
