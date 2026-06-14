import * as React from "react"

import { cn } from "@/lib/utils"

function PanelHeader({
  className,
  title,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  title: string
  icon?: React.ReactNode
}) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "relative z-20 flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2",
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2 text-[0.6875rem] font-medium tracking-wider text-wrap break-words text-muted-foreground uppercase">
        {icon}
        {title}
      </span>
      {children && (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {children}
        </div>
      )}
    </div>
  )
}

export { PanelHeader }
