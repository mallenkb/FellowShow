import { PresenterTimer } from "@/components/controls/presenter-timer"

export function TimerTab() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <PresenterTimer variant="panel" />
    </div>
  )
}
