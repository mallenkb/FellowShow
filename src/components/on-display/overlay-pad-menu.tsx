import type { ReactNode } from "react"
import {
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  RadioIcon,
  Trash2Icon,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

/** The right-click menu for one pad. */
export function OverlayPadMenu({
  selected,
  deleteLabel,
  onToggle,
  onShowLive,
  onEdit,
  onDelete,
  children,
}: {
  selected: boolean
  deleteLabel: string
  onToggle: () => void
  onShowLive: () => void
  onEdit: () => void
  onDelete: () => void
  children: ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem onSelect={onToggle}>
          {selected ? <EyeOffIcon /> : <EyeIcon />}
          {selected ? "Remove from Preview" : "Add to Preview"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onShowLive}>
          <RadioIcon />
          Show on Live now
        </ContextMenuItem>
        <ContextMenuItem onSelect={onEdit}>
          <PencilIcon />
          Edit
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2Icon />
          {deleteLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
