import type { ReactNode } from "react"

export function PreviewFooter({
  message,
  children,
}: {
  message?: string
  children: ReactNode
}) {
  return (
    <div className="relative z-10 flex min-w-0 flex-col gap-2">
      {message ? (
        <p className="text-center text-[0.625rem] leading-relaxed text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="flex min-w-0 gap-2">{children}</div>
    </div>
  )
}
