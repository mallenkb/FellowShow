import {
  resolveSlideBackground,
  sanitizeSlideBackground,
} from "@/lib/slide-background"
import type {
  AnnouncementBlock,
  AnnouncementRenderData,
  BroadcastTheme,
  GivingAccount,
  GivingDetails,
  GivingNetwork,
  VerseRenderData,
} from "@/types"

export const GIVING_NETWORK_LABELS: Record<GivingNetwork, string> = {
  "mtn-momo": "MTN MoMo",
  "telecel-cash": "Telecel Cash",
  "airteltigo-money": "AirtelTigo Money",
  bank: "Bank transfer",
}

export const GIVING_NETWORKS = Object.keys(
  GIVING_NETWORK_LABELS
) as GivingNetwork[]

const GIVING_SET_NAME = "Offering"
/** Stands in for a note id so the offering row can show when it is live. */
export const GIVING_ITEM_ID = "offering"
const MAX_ACCOUNTS = 6
const MAX_FIELD_LENGTH = 120

function isGivingNetwork(value: unknown): value is GivingNetwork {
  return typeof value === "string" && value in GIVING_NETWORK_LABELS
}

export function createGivingAccount(
  network: GivingNetwork = "mtn-momo"
): GivingAccount {
  return { id: crypto.randomUUID(), network, number: "" }
}

export function createDefaultGivingDetails(): GivingDetails {
  return {
    heading: "Give with Mobile Money",
    accounts: [createGivingAccount("mtn-momo")],
    accountName: "",
    reference: "Tithe + your name",
  }
}

export function canAddGivingAccount(details: GivingDetails): boolean {
  return details.accounts.length < MAX_ACCOUNTS
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : fallback
}

export function sanitizeGivingDetails(value: unknown): GivingDetails {
  const defaults = createDefaultGivingDetails()
  if (typeof value !== "object" || value === null) return defaults
  const candidate = value as Record<string, unknown>
  const rawAccounts = Array.isArray(candidate.accounts)
    ? candidate.accounts
    : []
  const accounts = rawAccounts
    .flatMap((raw): GivingAccount[] => {
      if (typeof raw !== "object" || raw === null) return []
      const account = raw as Record<string, unknown>
      if (typeof account.id !== "string" || !isGivingNetwork(account.network)) {
        return []
      }
      return [
        {
          id: account.id,
          network: account.network,
          number: text(account.number, ""),
        },
      ]
    })
    .slice(0, MAX_ACCOUNTS)
  const background = sanitizeSlideBackground(candidate.background)
  return {
    heading: text(candidate.heading, defaults.heading),
    accounts,
    accountName: text(candidate.accountName, ""),
    reference: text(candidate.reference, defaults.reference),
    ...(background ? { background } : {}),
  }
}

function filledAccounts(details: GivingDetails): GivingAccount[] {
  return details.accounts.filter((account) => account.number.trim())
}

/** One announcement page for the offering slide, or null with no numbers. */
export function givingRenderData(
  details: GivingDetails
): AnnouncementRenderData | null {
  const accounts = filledAccounts(details)
  if (accounts.length === 0) return null

  const blocks: AnnouncementBlock[] = accounts.map((account) => ({
    kind: "paragraph",
    runs: [
      { text: `${GIVING_NETWORK_LABELS[account.network]}: `, marks: [] },
      { text: account.number.trim(), marks: ["bold"] },
    ],
  }))
  const accountName = details.accountName.trim()
  if (accountName) {
    blocks.push({
      kind: "paragraph",
      runs: [{ text: `Name: ${accountName}`, marks: [] }],
    })
  }
  const reference = details.reference.trim()
  if (reference) {
    blocks.push({
      kind: "paragraph",
      runs: [{ text: `Reference: ${reference}`, marks: ["italic"] }],
    })
  }

  return {
    heading: details.heading.trim(),
    pageNumber: 1,
    pageCount: 1,
    items: [{ number: 1, blocks }],
  }
}

export function givingToVerse(
  details: GivingDetails,
  themes: readonly BroadcastTheme[] = []
): VerseRenderData | null {
  const page = givingRenderData(details)
  if (!page) return null
  const slideBackground = resolveSlideBackground(details.background, themes)
  return {
    ...(slideBackground ? { slideBackground } : {}),
    reference: page.heading,
    themeSection: "announcements",
    segments: [{ text: givingPlainText(details) }],
    announcement: page,
    announcementSetName: GIVING_SET_NAME,
    announcementItemIds: [GIVING_ITEM_ID],
  }
}

/** Single-line version for the scrolling ticker. */
export function givingPlainText(details: GivingDetails): string {
  const parts = filledAccounts(details).map(
    (account) =>
      `${GIVING_NETWORK_LABELS[account.network]}: ${account.number.trim()}`
  )
  if (parts.length === 0) return ""
  const accountName = details.accountName.trim()
  const reference = details.reference.trim()
  if (accountName) parts.push(`Name: ${accountName}`)
  if (reference) parts.push(`Reference: ${reference}`)
  const heading = details.heading.trim()
  return [heading, ...parts].filter(Boolean).join(" · ")
}
