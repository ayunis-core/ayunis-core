import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@ayunis/ui/components/button';
import { VersionHistory } from '@/widgets/artifact-editor';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useSpreadsheetEditorState } from '../model/useSpreadsheetEditorState';
import type { SpreadsheetExportFormat } from '../model/spreadsheet-export';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import { SpreadsheetExportMenu } from './SpreadsheetExportMenu';

interface SpreadsheetEditorProps {
  readonly artifact: ArtifactResponseDto;
  readonly onSave: (content: string) => void | Promise<void>;
  readonly onRevert: (versionNumber: number) => void;
  readonly onExport: (
    format: SpreadsheetExportFormat,
    unsavedContent?: string,
  ) => void;
  readonly onClose: () => void;
  readonly isExporting?: boolean;
}

export function SpreadsheetEditor({
  artifact,
  onSave,
  onRevert,
  onExport,
  onClose,
  isExporting,
}: SpreadsheetEditorProps) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();
  const editor = useSpreadsheetEditorState(artifact);
  const canSave =
    editor.isDirty &&
    !editor.isViewingHistory &&
    editor.displayedGridState.columns.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    await onSave(editor.getSerializedContent());
  };

  const handleExport = (format: SpreadsheetExportFormat) => {
    // Export what is on screen: a browsed historical version or unsaved
    // edits; undefined lets the backend export the saved current version.
    onExport(
      format,
      editor.isViewingHistory || editor.isDirty
        ? editor.getDisplayedSerializedContent()
        : undefined,
    );
  };

  const handleClose = () => {
    if (!editor.isDirty) {
      onClose();
      return;
    }
    confirm({
      title: t('spreadsheet.unsavedChanges.title'),
      description: t('spreadsheet.unsavedChanges.description'),
      confirmText: t(
        canSave
          ? 'spreadsheet.unsavedChanges.saveAndClose'
          : 'spreadsheet.unsavedChanges.discardAndClose',
      ),
      cancelText: t('spreadsheet.unsavedChanges.keepEditing'),
      onConfirm: async () => {
        if (canSave) {
          await handleSave();
        }
        onClose();
      },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="truncate text-sm font-semibold" title={artifact.title}>
          {artifact.title}
        </h3>
        <div className="flex items-center gap-1">
          <SpreadsheetExportMenu
            onExport={handleExport}
            isExporting={isExporting}
            disabled={editor.displayedGridState.columns.length === 0}
          />
          <Button
            variant="default"
            size="sm"
            className="h-8"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            <Save className="mr-1 size-3.5" />
            {t('editor.save')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {editor.isViewingHistory ? (
        <div className="bg-muted text-muted-foreground border-b px-3 py-1.5 text-xs">
          {t('spreadsheet.viewingHistory', {
            version: editor.displayedVersionNumber,
          })}
        </div>
      ) : (
        <SpreadsheetToolbar
          gridState={editor.displayedGridState}
          onAddRows={editor.addRows}
          onAddColumn={editor.addColumn}
          onRenameColumn={editor.renameColumn}
          onDeleteColumn={editor.deleteColumn}
          onMoveColumn={editor.moveColumn}
        />
      )}

      {!editor.isValid && (
        <div className="bg-destructive/10 text-destructive border-b px-3 py-1.5 text-xs">
          {t('spreadsheet.invalidContent')}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <SpreadsheetGrid
          columns={editor.displayedGridState.columns}
          rows={editor.displayedGridState.rows}
          onMoveColumn={editor.moveColumn}
          onRowsChange={editor.setRows}
          readOnly={editor.isViewingHistory}
        />
      </div>

      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={artifact.currentVersionNumber}
          selectedVersionNumber={editor.displayedVersionNumber}
          onSelect={editor.isDirty ? undefined : editor.selectVersion}
          onRevert={editor.isDirty ? undefined : onRevert}
        />
      )}
    </div>
  );
}
