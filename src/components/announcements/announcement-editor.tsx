import { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  UnderlineIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AnnouncementDocument } from "@/types"

interface AnnouncementEditorProps {
  content: AnnouncementDocument
  onChange: (content: AnnouncementDocument) => void
}

export default function AnnouncementEditor({
  content,
  onChange,
}: AnnouncementEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-32 px-3 py-2 text-sm leading-relaxed outline-none [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_p]:mb-2",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const json = currentEditor.getJSON()
      onChange({ type: "doc", content: json.content ?? [] })
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = JSON.stringify(editor.getJSON())
    const next = JSON.stringify(content)
    if (current !== next)
      editor.commands.setContent(content, { emitUpdate: false })
  }, [content, editor])

  if (!editor) {
    return <div className="h-40 animate-pulse rounded-md bg-muted/40" />
  }

  const toolClass = (active: boolean) =>
    cn("size-8", active && "bg-accent text-accent-foreground")

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex items-center gap-0.5 border-b border-border p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolClass(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <BoldIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolClass(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <ItalicIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolClass(editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <UnderlineIcon className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolClass(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bulleted list"
        >
          <ListIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolClass(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrderedIcon className="size-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
