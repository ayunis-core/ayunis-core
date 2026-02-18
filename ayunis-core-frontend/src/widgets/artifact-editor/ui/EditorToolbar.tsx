import type { Editor } from '@tiptap/react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Undo,
  Redo,
} from 'lucide-react';
import { useCallback } from 'react';

interface EditorToolbarProps {
  editor: Editor | null;
}

function ToolbarButton({
  onClick,
  isActive,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
    >
      <Icon className="size-4" />
    </Button>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl ?? '');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title="Bold"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title="Italic"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={Underline}
        title="Underline"
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title="Heading 1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title="Heading 2"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        title="Heading 3"
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title="Bullet List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title="Ordered List"
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        icon={AlignLeft}
        title="Align Left"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        icon={AlignCenter}
        title="Align Center"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        icon={AlignRight}
        title="Align Right"
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        icon={Link}
        title="Link"
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        icon={Undo}
        title="Undo"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        icon={Redo}
        title="Redo"
      />
    </div>
  );
}
