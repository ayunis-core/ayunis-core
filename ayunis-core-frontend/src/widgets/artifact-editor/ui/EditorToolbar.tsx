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
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarItem {
  onClick: () => void;
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

type ToolbarGroup = ToolbarItem[];

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

function ToolbarDivider() {
  return <div className="bg-border mx-1 h-6 w-px" />;
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

  const groups: ToolbarGroup[] = useMemo(() => {
    if (!editor) return [];
    const chain = () => editor.chain().focus();
    return [
      [
        {
          onClick: () => chain().toggleBold().run(),
          isActive: editor.isActive('bold'),
          icon: Bold,
          title: t('editor.toolbar.bold'),
        },
        {
          onClick: () => chain().toggleItalic().run(),
          isActive: editor.isActive('italic'),
          icon: Italic,
          title: t('editor.toolbar.italic'),
        },
        {
          onClick: () => chain().toggleUnderline().run(),
          isActive: editor.isActive('underline'),
          icon: Underline,
          title: t('editor.toolbar.underline'),
        },
      ],
      [
        {
          onClick: () => chain().toggleHeading({ level: 1 }).run(),
          isActive: editor.isActive('heading', { level: 1 }),
          icon: Heading1,
          title: t('editor.toolbar.heading1'),
        },
        {
          onClick: () => chain().toggleHeading({ level: 2 }).run(),
          isActive: editor.isActive('heading', { level: 2 }),
          icon: Heading2,
          title: t('editor.toolbar.heading2'),
        },
        {
          onClick: () => chain().toggleHeading({ level: 3 }).run(),
          isActive: editor.isActive('heading', { level: 3 }),
          icon: Heading3,
          title: t('editor.toolbar.heading3'),
        },
      ],
      [
        {
          onClick: () => chain().toggleBulletList().run(),
          isActive: editor.isActive('bulletList'),
          icon: List,
          title: t('editor.toolbar.bulletList'),
        },
        {
          onClick: () => chain().toggleOrderedList().run(),
          isActive: editor.isActive('orderedList'),
          icon: ListOrdered,
          title: t('editor.toolbar.orderedList'),
        },
      ],
      [
        {
          onClick: () => chain().setTextAlign('left').run(),
          isActive: editor.isActive({ textAlign: 'left' }),
          icon: AlignLeft,
          title: t('editor.toolbar.alignLeft'),
        },
        {
          onClick: () => chain().setTextAlign('center').run(),
          isActive: editor.isActive({ textAlign: 'center' }),
          icon: AlignCenter,
          title: t('editor.toolbar.alignCenter'),
        },
        {
          onClick: () => chain().setTextAlign('right').run(),
          isActive: editor.isActive({ textAlign: 'right' }),
          icon: AlignRight,
          title: t('editor.toolbar.alignRight'),
        },
      ],
      [
        {
          onClick: setLink,
          isActive: editor.isActive('link'),
          icon: Link,
          title: t('editor.toolbar.link'),
        },
      ],
      [
        {
          onClick: () => chain().undo().run(),
          isActive: false,
          icon: Undo,
          title: t('editor.toolbar.undo'),
        },
        {
          onClick: () => chain().redo().run(),
          isActive: false,
          icon: Redo,
          title: t('editor.toolbar.redo'),
        },
      ],
    ];
  }, [editor, setLink, t]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      {groups.map((group, groupIndex) => (
        <span key={groupIndex} className="contents">
          {groupIndex > 0 && <ToolbarDivider />}
          {group.map((item) => (
            <ToolbarButton
              key={item.title}
              onClick={item.onClick}
              isActive={item.isActive}
              icon={item.icon}
              title={item.title}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
