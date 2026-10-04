import { PlusIcon, TextIcon, Trash2Icon } from "lucide-react"
import { SlideBackgroundPicker } from "@/components/announcements/slide-background-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  canAddGivingAccount,
  GIVING_NETWORK_LABELS,
  GIVING_NETWORKS,
  givingPlainText,
  givingToVerse,
} from "@/lib/giving"
import {
  useAnnouncementStore,
  useBroadcastStore,
  useTickerComposerStore,
} from "@/stores"
import type { GivingNetwork } from "@/types"

// Edits stage the slide so Preview follows the numbers as they are typed.
function stageGiving() {
  const verse = givingToVerse(
    useAnnouncementStore.getState().giving,
    useBroadcastStore.getState().themes
  )
  if (verse) useBroadcastStore.getState().setPreviewOutput(verse, null)
}

export function GivingWorkspace() {
  const giving = useAnnouncementStore((state) => state.giving)
  const hasNumbers = giving.accounts.some((account) => account.number.trim())

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        <Input
          value={giving.heading}
          onChange={(event) => {
            useAnnouncementStore
              .getState()
              .updateGiving({ heading: event.target.value })
            stageGiving()
          }}
          placeholder="Slide heading (leave empty to hide)"
          aria-label="Slide heading"
          className="h-10 shrink-0 border-transparent bg-transparent px-2 text-base font-semibold shadow-none hover:border-border focus-visible:border-primary"
        />
        <div className="-mt-2 px-2">
          <SlideBackgroundPicker
            value={giving.background}
            onChange={(background) => {
              useAnnouncementStore.getState().setGivingBackground(background)
              stageGiving()
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="px-0.5 text-xs font-medium text-muted-foreground">
            Payment numbers
          </p>
          {giving.accounts.map((account) => {
            const label = GIVING_NETWORK_LABELS[account.network]
            return (
              <div key={account.id} className="flex items-center gap-2">
                <Select
                  value={account.network}
                  onValueChange={(value) => {
                    useAnnouncementStore
                      .getState()
                      .updateGivingAccount(account.id, {
                        network: value as GivingNetwork,
                      })
                    stageGiving()
                  }}
                >
                  <SelectTrigger
                    className="w-40 shrink-0"
                    aria-label={`Network for ${label}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {GIVING_NETWORKS.map((network) => (
                      <SelectItem key={network} value={network}>
                        {GIVING_NETWORK_LABELS[network]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={account.number}
                  onChange={(event) => {
                    useAnnouncementStore
                      .getState()
                      .updateGivingAccount(account.id, {
                        number: event.target.value,
                      })
                    stageGiving()
                  }}
                  placeholder={
                    account.network === "bank"
                      ? "Account number"
                      : "Merchant ID or number"
                  }
                  aria-label={`${label} number`}
                  className="min-w-0 flex-1 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${label}`}
                  onClick={() => {
                    useAnnouncementStore
                      .getState()
                      .removeGivingAccount(account.id)
                    stageGiving()
                  }}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start border-dashed"
            disabled={!canAddGivingAccount(giving)}
            onClick={() => useAnnouncementStore.getState().addGivingAccount()}
          >
            <PlusIcon className="size-4" />
            Add a number
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Account name shown
            <Input
              value={giving.accountName}
              onChange={(event) => {
                useAnnouncementStore
                  .getState()
                  .updateGiving({ accountName: event.target.value })
                stageGiving()
              }}
              placeholder="Name on the account"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Reference to type
            <Input
              value={giving.reference}
              onChange={(event) => {
                useAnnouncementStore
                  .getState()
                  .updateGiving({ reference: event.target.value })
                stageGiving()
              }}
              placeholder="Tithe + your name"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-border p-3">
        <span className="mr-auto text-xs text-muted-foreground">
          {hasNumbers
            ? "Shown on its own slide"
            : "Add a number to create the slide"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7"
          disabled={!hasNumbers}
          onClick={() =>
            useTickerComposerStore.getState().open(givingPlainText(giving))
          }
        >
          <TextIcon className="size-3.5" />
          Send to scroll
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          disabled={!hasNumbers}
          onClick={stageGiving}
        >
          Preview
        </Button>
      </div>
    </section>
  )
}
