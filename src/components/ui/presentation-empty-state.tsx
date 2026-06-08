import { cn } from "@/lib/utils"

interface PresentationEmptyStateProps {
  className?: string
  disabled?: boolean
}

export function PresentationEmptyState({
  className,
  disabled = false,
}: PresentationEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex aspect-video w-full items-center justify-center rounded-md bg-black text-center",
        disabled && "opacity-40",
        className
      )}
    >
      <div className="max-w-[18rem] px-6">
        <p className="text-sm font-medium text-white">No presentation image</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Upload or drag media into the presentation tab to preview it here.
        </p>
      </div>
    </div>
  )
}
