import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Save, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { VersionHistory } from './VersionHistory';
import { ExportButtons } from './ExportButtons';

interface ArtifactEditorProps {
  artifact: ArtifactResponseDto;
  onSave: (content: string) => void;
  onRevert: (versionNumber: number) => void;
  onExport: (format: 'docx' | 'pdf') => void;
  onClose: () => void;
}

export function ArtifactEditor({
  artifact,
  onSave,
  onRevert,
  onExport,
  onClose,
}: ArtifactEditorProps) {
  const currentVersion = artifact.versions?.find(
    (v) => v.versionNumber === artifact.currentVersionNumber,
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: currentVersion?.content ?? '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none p-4 outline-none min-h-[200px]',
      },
    },
  });

  // Update editor content when artifact changes (e.g. after revert or external update)
  useEffect(() => {
    if (!editor || !currentVersion) return;

    const currentHtml = editor.getHTML();
    if (currentHtml !== currentVersion.content) {
      editor.commands.setContent(currentVersion.content);
    }
  }, [editor, currentVersion]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    onSave(editor.getHTML());
  }, [editor, onSave]);

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="truncate text-sm font-semibold" title={artifact.title}>
          {artifact.title}
        </h3>
        <div className="flex items-center gap-1">
          <ExportButtons onExport={onExport} />
          <Button
            variant="default"
            size="sm"
            className="h-8"
            onClick={handleSave}
          >
            <Save className="mr-1 size-3.5" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Version history */}
      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={artifact.currentVersionNumber}
          onRevert={onRevert}
        />
      )}
    </div>
  );
}
