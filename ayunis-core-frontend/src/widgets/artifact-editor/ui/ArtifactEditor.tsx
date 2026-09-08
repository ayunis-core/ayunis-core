import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@ayunis/ui/components/button';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { Save } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { EditorToolbar } from './EditorToolbar';
import { VersionHistory } from './VersionHistory';
import { ExportButtons } from './ExportButtons';
import { LetterheadPicker } from './LetterheadPicker';
import { useIsLetterheadsEnabled } from '@/features/feature-toggles';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { ArtifactPanelHeader } from '@/widgets/artifact-panel-header';

interface ArtifactEditorProps {
  readonly artifact: ArtifactResponseDto;
  readonly onSave: (content: string) => void | Promise<void>;
  readonly onRevert: (versionNumber: number) => void;
  readonly onExport: (format: 'docx' | 'pdf', unsavedContent?: string) => void;
  readonly onClose: () => void;
  readonly onBack: () => void;
  readonly onLetterheadChange?: (letterheadId: string | null) => void;
  readonly isExporting?: boolean;
}

export const ArtifactEditor = forwardRef<
  ArtifactPanelHandle,
  ArtifactEditorProps
>(function ArtifactEditor(
  {
    artifact,
    onSave,
    onRevert,
    onExport,
    onClose,
    onBack,
    onLetterheadChange,
    isExporting,
  },
  ref,
) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();
  const isLetterheadsEnabled = useIsLetterheadsEnabled();

  const currentVersion = artifact.versions?.find(
    (v) => v.versionNumber === artifact.currentVersionNumber,
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: t('editor.placeholder') }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: currentVersion?.content ?? '',
    editorProps: {
      attributes: {
        // A table with no header row is a letter's address and contact block,
        // not tabular data — render it borderless, as PDF export does.
        class:
          'prose prose-sm dark:prose-invert max-w-none p-4 outline-none min-h-[200px] [&_table:not(:has(th))_tr]:border-none [&_table:not(:has(th))_td]:border-none',
      },
    },
  });

  // Track which version is currently loaded in the editor
  const loadedVersionRef = useRef(artifact.currentVersionNumber);

  // Update editor content only when the version number actually changes
  useEffect(() => {
    if (!currentVersion) return;

    if (loadedVersionRef.current !== artifact.currentVersionNumber) {
      loadedVersionRef.current = artifact.currentVersionNumber;
      editor.commands.setContent(currentVersion.content);
    }
  }, [editor, currentVersion, artifact.currentVersionNumber]);

  const handleSave = useCallback(async () => {
    await onSave(editor.getHTML());
  }, [editor, onSave]);

  const requestExit = useCallback(
    (onExit: () => void) => {
      const content = editor.getHTML();
      if (!currentVersion || content === currentVersion.content) {
        onExit();
        return;
      }
      confirm({
        title: t('unsavedChanges.title'),
        description: t('unsavedChanges.description'),
        confirmText: t('unsavedChanges.saveAndExit'),
        cancelText: t('unsavedChanges.keepEditing'),
        onConfirm: async () => {
          await onSave(content);
          onExit();
        },
      });
    },
    [confirm, currentVersion, editor, onSave, t],
  );

  useImperativeHandle(ref, () => ({ requestExit }), [requestExit]);

  const handleExport = useCallback(
    (format: 'docx' | 'pdf') => {
      const isDirty =
        currentVersion && editor.getHTML() !== currentVersion.content;
      onExport(format, isDirty ? editor.getHTML() : undefined);
    },
    [editor, currentVersion, onExport],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <ArtifactPanelHeader
        title={
          <h3 className="truncate text-sm font-semibold" title={artifact.title}>
            {artifact.title}
          </h3>
        }
        actions={
          <>
            <ExportButtons onExport={handleExport} isExporting={isExporting} />
            {isLetterheadsEnabled && onLetterheadChange && (
              <LetterheadPicker
                letterheadId={artifact.letterheadId}
                onLetterheadChange={onLetterheadChange}
              />
            )}
            <Button
              variant="default"
              size="sm"
              className="h-8"
              onClick={() => void handleSave()}
            >
              <Save className="mr-1 size-3.5" />
              {t('editor.save')}
            </Button>
          </>
        }
        onBack={() => requestExit(onBack)}
        onClose={() => requestExit(onClose)}
      />

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
});
