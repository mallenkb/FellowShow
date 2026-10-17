import { getLowerThirdOpacity } from "./overlays"
import { DESIGN_SPECS, type DesignText } from "./lower-third-design-spec"
import { drawDesignText, layoutDesignText } from "./lower-third-design-text"
import {
  LOWER_THIRD_DESIGN_OPTIONS,
  type LowerThirdDesignStyle,
} from "@/types/lower-third-designs"
import type { BroadcastOverlayPayload } from "@/types"

type Graphic = NonNullable<BroadcastOverlayPayload["lowerThird"]>
interface Options {
  now?: number
  scale?: number
  offsetX?: number
  offsetY?: number
  imageCache?: Map<string, HTMLImageElement>
}

function alpha(color: string, opacity: number): string {
  const hex = color.replace("#", "")
  if (!/^[0-9a-f]{6}$/i.test(hex)) return `rgba(0,0,0,${opacity})`
  return `rgba(${[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${opacity})`
}

/** Canvas translation of .d1 through .d15 in FellowShow Lower Thirds.html. */
export function drawLowerThirdDesign(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  graphic: Graphic,
  style: LowerThirdDesignStyle,
  options: Options
): { x: number; y: number; width: number; height: number } | null {
  const opacity = getLowerThirdOpacity(graphic, options.now ?? Date.now())
  if (opacity <= 0 || !graphic.title.trim() || width <= 0 || height <= 0)
    return null
  const spec = DESIGN_SPECS[style]
  const defaults = LOWER_THIRD_DESIGN_OPTIONS.find(
    (item) => item.value === style
  )!
  const u =
    (width / 100) * (options.scale ?? 1) * ((graphic.sizePercent ?? 100) / 100)
  const ox = options.offsetX ?? 0
  const oy = options.offsetY ?? 0
  const accent = graphic.accentColor ?? defaults.accent
  const bg = graphic.backgroundColor
  const fg = graphic.textColor
  const roleColor =
    fg !== defaults.defaultTextColor
      ? fg
      : graphic.accentColor && ["smoked-glass", "long-rule"].includes(style)
        ? accent
        : spec.roleColor
  const [pt, pr, pb, pl] = spec.padding.map((value) => value * u)
  const photo = style === "photo-circle"
  const logo = style === "logo-square"
  const capsule = style === "capsule"
  const news = style === "news-strap"
  const centered = style === "centered"
  const tabs =
    style === "stacked-tabs" ||
    style === "angled" ||
    style === "split-strip" ||
    centered
  const naked =
    style === "text-only" || style === "thick-accent" || style === "long-rule"
  const border =
    (style === "clean-white" ? 0.6 : style === "outline-frame" ? 0.25 : 0) * u
  const badge = photo ? 6.4 * u : logo ? 7.4 * u : 0
  const leading = photo
    ? badge + 1.8 * u
    : logo
      ? badge
      : style === "thick-accent"
        ? 2.7 * u
        : 0
  const maxWidth =
    style === "long-rule"
      ? width * 0.95
      : width *
        (graphic.maxWidthEnabled === false
          ? 0.95
          : Math.min(0.95, graphic.widthPercent / 100))
  const available = Math.max(
    u,
    maxWidth - pl - pr - leading - border * (style === "outline-frame" ? 2 : 1)
  )
  const rolePadding =
    style === "stacked-tabs"
      ? [0.6, 2.4, 0.6, 2.4]
      : style === "angled"
        ? [0.6, 3.6, 0.6, 2.4]
        : style === "split-strip"
          ? [0.6, 2.6, 0.6, 2.6]
          : [0.5, 2.4, 0.5, 2.4]
  const [rpt, rpr, rpb, rpl] = rolePadding.map((value) => value * u)
  const roleInset = style === "stacked-tabs" ? 2 * u : 0
  const roleBorder = style === "split-strip" ? 0.25 * u : 0
  const surname =
    style === "long-rule" ? graphic.title.trim().split(/\s+/).at(-1) : undefined
  const role = graphic.subtitle?.trim() ?? ""
  const tagSpec: DesignText = {
    size: 1.7,
    weight: 700,
    line: 1.2,
    spacing: 0.14,
    family: "condensed",
    uppercase: true,
  }
  ctx.save()
  let titleMax = available
  let roleMax = tabs ? Math.max(u, maxWidth - rpl - rpr - roleInset) : available
  if (capsule && role) {
    const titleNatural = layoutDesignText(
      ctx,
      graphic.title,
      spec.title,
      u,
      Infinity
    ).width
    const roleNatural = layoutDesignText(
      ctx,
      role,
      spec.role,
      u,
      Infinity
    ).width
    const remaining = Math.max(
      2 * u,
      maxWidth - pl - pr - (1.5 + 2.8 + 2.8 + 0.15) * u
    )
    titleMax =
      (remaining * titleNatural) / Math.max(1, titleNatural + roleNatural)
    roleMax = remaining - titleMax
  } else if (capsule) titleMax = Math.max(u, available - 2.9 * u)
  const title = layoutDesignText(
    ctx,
    graphic.title,
    spec.title,
    u,
    titleMax,
    surname
  )
  const subtitle = layoutDesignText(
    ctx,
    role,
    spec.role,
    u,
    roleMax,
    undefined,
    style === "long-rule"
  )
  const label = layoutDesignText(
    ctx,
    news
      ? graphic.label?.trim() ||
          (graphic.theme === "speaker" ? "Guest speaker" : graphic.theme)
      : (graphic.label?.trim() ?? ""),
    news
      ? tagSpec
      : { size: 1, weight: 600, line: 1.4, spacing: 0.1, uppercase: true },
    u,
    available
  )
  const labelHeight = news
    ? 0
    : label.height + (label.lines.length ? 0.4 * u : 0)
  const titleHeight = title.height + labelHeight
  const gap = subtitle.lines.length ? spec.gap * u : 0
  let titlePanelWidth = title.width + pl + pr
  let rolePanelWidth = subtitle.width + rpl + rpr
  const titlePanelHeight = pt + titleHeight + pb
  const rolePanelHeight = subtitle.lines.length
    ? rpt + subtitle.height + rpb + roleBorder
    : 0
  const textHeight = titleHeight + gap + subtitle.height
  let w =
    Math.max(title.width, subtitle.width, label.width) +
    pl +
    pr +
    leading +
    border * (style === "outline-frame" ? 2 : 1)
  let h = pt + pb + Math.max(textHeight, photo ? badge : 0)
  if (style === "outline-frame") h += border * 2
  if (style === "smoked-glass") h += 0.2 * u
  if (tabs) {
    w = Math.max(titlePanelWidth, rolePanelWidth + roleInset)
    if (style === "split-strip") titlePanelWidth = rolePanelWidth = w
    h = titlePanelHeight + rolePanelHeight
  }
  if (capsule) {
    w =
      pl +
      pr +
      1.5 * u +
      1.4 * u +
      title.width +
      (role ? (1.4 + 1.4 + 1.4 + 0.15) * u + subtitle.width : 0)
    h = pt + pb + Math.max(titleHeight, subtitle.height, 1.5 * u)
  }
  const tagHeight = news ? label.height + 1 * u : 0
  if (news) {
    w = Math.max(38 * u, w, label.width + 4.8 * u)
    h += tagHeight + 0.5 * u
  }
  if (style === "long-rule") w = width * 0.95
  w = Math.min(maxWidth, w)
  const anchorLeft = graphic.anchor === "bottom-left"
  const bottom = anchorLeft || graphic.anchor === "bottom-center"
  const x =
    ox +
    Math.max(
      0,
      Math.min(
        width - w,
        (width * graphic.xPercent) / 100 - (anchorLeft ? 0 : w / 2)
      )
    )
  const y =
    oy +
    Math.max(
      0,
      Math.min(
        height - h,
        (height * graphic.yPercent) / 100 - (bottom ? h : h / 2)
      )
    )
  let tx = x + pl + leading + border
  let ty =
    y +
    pt +
    (style === "outline-frame" ? border : 0) +
    (photo ? (h - pt - pb - textHeight) / 2 : 0) +
    tagHeight
  let ry = ty + titleHeight + gap
  ctx.globalAlpha = opacity
  ctx.shadowColor = "transparent"

  const rect = (
    color: string | CanvasGradient,
    left: number,
    top: number,
    rw: number,
    rh: number,
    radius: number | number[] = 0
  ) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(left, top, Math.max(0, rw), Math.max(0, rh), radius)
    ctx.fill()
  }
  const shadow = (color: string, blur: number, offset: number) => {
    ctx.shadowColor = color
    ctx.shadowBlur = blur * u
    ctx.shadowOffsetY = offset * u
  }
  const gradient = (start: string, end: string, x1 = x, x2 = x + w) => {
    const fill = ctx.createLinearGradient(x1, y, x2, y)
    fill.addColorStop(0, start)
    fill.addColorStop(1, end)
    return fill
  }
  const slant = (
    fill: string | CanvasGradient,
    left: number,
    top: number,
    rw: number,
    rh: number,
    cut: number,
    reverse: boolean
  ) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(left, top)
    ctx.lineTo(left + rw - (reverse ? cut : 0), top)
    ctx.lineTo(left + rw - (reverse ? 0 : cut), top + rh)
    ctx.lineTo(left, top + rh)
    ctx.closePath()
    ctx.fill()
  }

  if (
    ["clean-white", "ivory-serif", "logo-square", "split-strip"].includes(style)
  )
    shadow("#00000044", 3, 1)
  if (capsule) shadow("#00000055", 2.4, 0.8)
  if (!naked && !tabs && !news && !logo && style !== "smoked-glass") {
    rect(
      style === "outline-frame" ? alpha(bg, 0.25) : photo ? alpha(bg, 0.9) : bg,
      x,
      y,
      w,
      h,
      photo || capsule ? h / 2 : style === "clean-white" ? 0.3 * u : 0
    )
  }
  ctx.shadowColor = "transparent"
  switch (style) {
    case "clean-white":
      rect(accent, x, y, 0.6 * u, h, [0.3 * u, 0, 0, 0.3 * u])
      break
    case "smoked-glass": {
      // Blur only pixels already painted behind the graphic. Transparent NDI
      // frames have no camera image to blur, so the translucent panel remains.
      if (ctx.canvas) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(x, y, w, h)
        ctx.clip()
        ctx.filter = "blur(14px)"
        ctx.drawImage(
          ctx.canvas,
          x - 42,
          y - 42,
          w + 84,
          h + 84,
          x - 42,
          y - 42,
          w + 84,
          h + 84
        )
        ctx.restore()
      }
      rect(gradient(alpha(bg, 0.8), alpha(bg, 0.6)), x, y, w, h)
      rect(accent, x, y + h - 0.2 * u, w, 0.2 * u)
      break
    }
    case "stacked-tabs":
    case "centered": {
      const titleLeft = centered ? x + (w - titlePanelWidth) / 2 : x
      rect(
        centered ? alpha(bg, 0.8) : bg,
        titleLeft,
        y,
        titlePanelWidth,
        titlePanelHeight,
        centered ? [0.4 * u, 0.4 * u, 0, 0] : 0
      )
      if (rolePanelHeight)
        rect(
          accent,
          centered ? x + (w - rolePanelWidth) / 2 : x + roleInset,
          y + titlePanelHeight,
          rolePanelWidth,
          rolePanelHeight,
          centered ? [0, 0, 0.4 * u, 0.4 * u] : 0
        )
      tx = centered ? x + w / 2 : x + pl
      ry = y + titlePanelHeight + rpt
      break
    }
    case "photo-circle": {
      const cx = x + pl + badge / 2
      const cy = y + h / 2
      rect(
        "#ffffff",
        cx - badge / 2 - 0.3 * u,
        cy - badge / 2 - 0.3 * u,
        badge + 0.6 * u,
        badge + 0.6 * u,
        (badge + 0.6 * u) / 2
      )
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, badge / 2, 0, Math.PI * 2)
      ctx.clip()
      const image = graphic.avatarImageUrl
        ? options.imageCache?.get(graphic.avatarImageUrl)
        : undefined
      if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
        const ratio = Math.max(
          badge / image.naturalWidth,
          badge / image.naturalHeight
        )
        ctx.drawImage(
          image,
          cx - (image.naturalWidth * ratio) / 2,
          cy - (image.naturalHeight * ratio) / 2,
          image.naturalWidth * ratio,
          image.naturalHeight * ratio
        )
      } else {
        const fill = ctx.createRadialGradient(
          cx - badge * 0.15,
          cy - badge * 0.2,
          0,
          cx - badge * 0.15,
          cy - badge * 0.2,
          badge * Math.hypot(0.65, 0.7)
        )
        fill.addColorStop(0, "#93c5fd")
        fill.addColorStop(1, graphic.accentColor ?? "#1d4ed8")
        rect(fill, cx - badge / 2, cy - badge / 2, badge, badge)
        const names = graphic.title.trim().split(/\s+/)
        while (
          names.length > 1 &&
          /^(pastor|elder|apostle|dr\.?|reverend|rev\.?|bishop|prophet|minister)$/i.test(
            names[0]
          )
        )
          names.shift()
        const initials = [names[0], names.length > 1 ? names.at(-1) : undefined]
          .filter(Boolean)
          .map((word) => [...word!][0])
          .join("")
          .toUpperCase()
        const text = layoutDesignText(
          ctx,
          initials,
          { size: 2.2, weight: 700, line: 1.5 },
          u,
          badge
        )
        drawDesignText(ctx, text, cx, cy - text.height / 2, u, "#ffffff", true)
      }
      ctx.restore()
      break
    }
    case "capsule": {
      const diameter = 1.5 * u
      const dx = x + pl
      const dy = y + h / 2 - diameter / 2
      rect(
        alpha(accent, 0.33),
        dx - 0.35 * u,
        dy - 0.35 * u,
        diameter + 0.7 * u,
        diameter + 0.7 * u,
        (diameter + 0.7 * u) / 2
      )
      rect(accent, dx, dy, diameter, diameter, diameter / 2)
      tx = dx + diameter + 1.4 * u
      ty = y + (h - titleHeight) / 2
      ry = y + (h - subtitle.height) / 2
      if (role)
        rect(
          "#dddddd",
          tx + title.width + 2.8 * u,
          ry,
          0.15 * u,
          subtitle.height
        )
      break
    }
    case "news-strap":
      rect(accent, x, y, label.width + 4.8 * u, tagHeight)
      rect(bg, x, y + tagHeight, w, h - tagHeight)
      rect(fg, x, y + h - 0.5 * u, w, 0.5 * u)
      drawDesignText(ctx, label, x + 2.4 * u, y + 0.5 * u, u, "#ffffff")
      break
    case "text-only":
      shadow("#00000088", 0.6, 0.1)
      rect(accent, x, y + titleHeight + 0.9 * u, 8 * u, 0.3 * u)
      ctx.shadowColor = "transparent"
      break
    case "ivory-serif":
      rect(accent, x, y, w, 0.4 * u)
      break
    case "angled":
      slant(
        gradient(bg, accent),
        x,
        y,
        titlePanelWidth,
        titlePanelHeight,
        2.4 * u,
        false
      )
      if (rolePanelHeight)
        slant(
          "#ffffff",
          x,
          y + titlePanelHeight,
          rolePanelWidth,
          rolePanelHeight,
          1.6 * u,
          true
        )
      ry = y + titlePanelHeight + rpt
      break
    case "thick-accent":
      shadow(alpha(accent, 0.53), 1.2, 0)
      rect(accent, x, y, 0.9 * u, h, 0.2 * u)
      ctx.shadowColor = "transparent"
      break
    case "split-strip":
      shadow("#00000044", 3, 1)
      rect(bg, x, y, w, titlePanelHeight)
      ctx.shadowColor = "transparent"
      if (rolePanelHeight) {
        rect("#0b1b3a", x, y + titlePanelHeight, w, rolePanelHeight)
        rect(accent, x, y + titlePanelHeight, w, roleBorder)
      }
      ry = y + titlePanelHeight + rpt + roleBorder
      break
    case "logo-square": {
      shadow("#00000055", 3, 1)
      rect("#111111", x, y, badge, h)
      rect(
        gradient(bg, accent, x + badge, x + badge + (w - badge) * 0.7),
        x + badge,
        y,
        w - badge,
        h
      )
      ctx.shadowColor = "transparent"
      const size = 4.6 * u * ((graphic.logoSizePercent ?? 100) / 100)
      const cx = x + badge / 2
      const cy = y + h / 2
      const image = graphic.logoImageUrl
        ? options.imageCache?.get(graphic.logoImageUrl)
        : undefined
      if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
        const ratio = Math.min(
          size / image.naturalWidth,
          size / image.naturalHeight
        )
        ctx.drawImage(
          image,
          cx - (image.naturalWidth * ratio) / 2,
          cy - (image.naturalHeight * ratio) / 2,
          image.naturalWidth * ratio,
          image.naturalHeight * ratio
        )
      } else {
        const fill = ctx.createConicGradient(-Math.PI / 2, cx, cy)
        fill.addColorStop(0, "#f97316")
        fill.addColorStop(1 / 3, "#db2777")
        fill.addColorStop(2 / 3, "#7c3aed")
        fill.addColorStop(1, "#f97316")
        rect(fill, cx - size / 2, cy - size / 2, size, size, size / 2)
        const text = layoutDesignText(
          ctx,
          "FC",
          { size: 1.6, weight: 800, line: 1.5 },
          u,
          size
        )
        drawDesignText(ctx, text, cx, cy - text.height / 2, u, "#ffffff", true)
      }
      break
    }
    case "outline-frame":
      ctx.strokeStyle = fg
      ctx.lineWidth = border
      ctx.strokeRect(x + border / 2, y + border / 2, w - border, h - border)
      rect(accent, x, y, 3 * u, border)
      break
    case "long-rule": {
      const start = tx + subtitle.width + 1.6 * u
      const end = ox + width
      rect(
        gradient(graphic.accentColor ?? "#bae6fd", "transparent", start, end),
        start,
        ry + subtitle.height / 2 - 0.09 * u,
        Math.max(0, end - start),
        0.18 * u
      )
      break
    }
  }
  if (naked || style === "outline-frame")
    shadow(
      style === "outline-frame" ? "#000000aa" : "#000000bb",
      style === "text-only" ? 1.2 : 0.8,
      style === "text-only" ? 0.2 : 0.15
    )
  if (!news && label.lines.length)
    drawDesignText(ctx, label, tx, ty, u, fg, centered)
  drawDesignText(ctx, title, tx, ty + labelHeight, u, fg, centered)
  if (logo) ctx.globalAlpha *= 0.92
  const roleX = centered
    ? x + w / 2
    : capsule
      ? tx + title.width + (1.4 + 1.4 + 1.4 + 0.15) * u
      : tabs
        ? x + roleInset + rpl
        : tx
  drawDesignText(ctx, subtitle, roleX, ry, u, roleColor, centered)
  ctx.restore()
  return { x, y, width: w, height: h }
}
