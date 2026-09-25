// Play order and jump keys for a prepared song's lyric blocks. Long sections
// are split into several blocks that share a label, so consecutive blocks with
// the same label are treated as one section.

const CHORUS_RE = /^(chorus|refrain|ref|rh)\b/i
const BRIDGE_RE = /^bridge\b/i

interface Section {
  label: string
  blocks: number[]
}

function sectionsOf(labels: string[]): Section[] {
  const sections: Section[] = []
  labels.forEach((label, index) => {
    const last = sections.at(-1)
    if (last && last.label === label) last.blocks.push(index)
    else sections.push({ label, blocks: [index] })
  })
  return sections
}

function isChorus(section: Section) {
  return CHORUS_RE.test(section.label.trim())
}

/** A chorus can repeat when the song has one and at least two other sections. */
export function canRepeatChorus(labels: string[]): boolean {
  const sections = sectionsOf(labels)
  return (
    sections.some(isChorus) &&
    sections.filter((section) => !isChorus(section)).length >= 2
  )
}

/**
 * Block indexes in the order they should play. With repeatChorus, the first
 * chorus is sung after every other section unless the lyrics already place a
 * chorus there.
 */
export function songPlayOrder(
  labels: string[],
  repeatChorus: boolean
): number[] {
  const inOrder = labels.map((_, index) => index)
  if (!repeatChorus) return inOrder
  const sections = sectionsOf(labels)
  const chorus = sections.find(isChorus)
  if (!chorus) return inOrder

  const order: number[] = []
  sections.forEach((section, index) => {
    order.push(...section.blocks)
    const next = sections[index + 1]
    if (!isChorus(section) && !(next && isChorus(next))) {
      order.push(...chorus.blocks)
    }
  })
  return order
}

/** Block to jump to for a key: 1–9 for verses, C for chorus, B for bridge. */
export function songJumpTarget(labels: string[], key: string): number | null {
  const sections = sectionsOf(labels)
  const lower = key.toLowerCase()
  if (lower === "c") return sections.find(isChorus)?.blocks[0] ?? null
  if (lower === "b") {
    return (
      sections.find((section) => BRIDGE_RE.test(section.label.trim()))
        ?.blocks[0] ?? null
    )
  }
  if (!/^[1-9]$/.test(key)) return null
  const labeled = sections.find((section) =>
    new RegExp(`^verse\\s*${key}\\b`, "i").test(section.label.trim())
  )
  if (labeled) return labeled.blocks[0]
  const verses = sections.filter(
    (section) => !isChorus(section) && !BRIDGE_RE.test(section.label.trim())
  )
  return verses[Number(key) - 1]?.blocks[0] ?? null
}
