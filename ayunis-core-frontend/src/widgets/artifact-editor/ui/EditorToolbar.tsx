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
import { useTranslation } from 'react-i18next';

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

const ALLOWED_PROTOCOLS = /^(https?:\/\/|mailto:)/i;

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { t } = useTranslation('artifacts');

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(t('editor.linkPrompt'), previousUrl ?? '');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (!ALLOWED_PROTOCOLS.test(url)) {
      window.alert(t('editor.invalidUrl'));
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor, t]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title={t('editor.toolbar.bold')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title={t('editor.toolbar.italic')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={Underline}
        title={t('editor.toolbar.underline')}
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title={t('editor.toolbar.heading1')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title={t('editor.toolbar.heading2')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        title={t('editor.toolbar.heading3')}
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title={t('editor.toolbar.bulletList')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title={t('editor.toolbar.orderedList')}
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        icon={AlignLeft}
        title={t('editor.toolbar.alignLeft')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        icon={AlignCenter}
        title={t('editor.toolbar.alignCenter')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        icon={AlignRight}
        title={t('editor.toolbar.alignRight')}
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        icon={Link}
        title={t('editor.toolbar.link')}
      />

      <div className="bg-border mx-1 h-6 w-px" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        icon={Undo}
        title={t('editor.toolbar.undo')}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        icon={Redo}
        title={t('editor.toolbar.redo')}
      />
    </div>
  );
}
