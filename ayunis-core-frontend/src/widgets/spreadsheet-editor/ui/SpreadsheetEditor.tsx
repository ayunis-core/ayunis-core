import { Save } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@ayunis/ui/components/button';
import { VersionHistory } from '@/widgets/artifact-editor';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useSpreadsheetEditorState } from '@/widgets/spreadsheet-editor/model/useSpreadsheetEditorState';
import type { SpreadsheetExportFormat } from '@/widgets/spreadsheet-editor/model/spreadsheet-export';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import { SpreadsheetExportMenu } from './SpreadsheetExportMenu';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactPanelHeader } from '@/widgets/artifact-panel-header';

interface SpreadsheetEditorProps {
  readonly artifact: ArtifactResponseDto;
  readonly onSave: (content: string) => void | Promise<void>;
  readonly onRevert: (versionNumber: number) => void;
  readonly onExport: (
    format: SpreadsheetExportFormat,
    unsavedContent?: string,
    versionNumber?: number,
  ) => void;
  readonly onClose: () => void;
  readonly onBack: () => void;
  readonly isExporting?: boolean;
  readonly showClose?: boolean;
}

export const SpreadsheetEditor = forwardRef<
  ArtifactPanelHandle,
  SpreadsheetEditorProps
>(function SpreadsheetEditor(
  {
    artifact,
    onSave,
    onRevert,
    onExport,
    onClose,
    onBack,
    isExporting,
    showClose = true,
  },
  ref,
) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();
  const editor = useSpreadsheetEditorState(artifact);
  const canSave =
    editor.isDirty &&
    !editor.isViewingHistory &&
    editor.displayedGridState.columns.length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return;
    }
    await onSave(editor.getSerializedContent());
  }, [canSave, editor, onSave]);

  const handleExport = (format: SpreadsheetExportFormat) => {
    // Historical exports use the immutable server version. Current unsaved
    // edits are saved first so the downloaded file matches the editor.
    const unsavedContent =
      !editor.isViewingHistory && editor.isDirty
        ? editor.getSerializedContent()
        : undefined;
    onExport(
      format,
      unsavedContent,
      editor.isViewingHistory ? editor.displayedVersionNumber : undefined,
    );
  };

  const handleExit = useCallback(
    (onExit: () => void) => {
      if (!editor.isDirty) {
        onExit();
        return;
      }
      confirm({
        title: t('spreadsheet.unsavedChanges.title'),
        description: t('spreadsheet.unsavedChanges.description'),
        confirmText: t(
          canSave
            ? 'spreadsheet.unsavedChanges.saveAndContinue'
            : 'spreadsheet.unsavedChanges.discardAndContinue',
        ),
        cancelText: t('spreadsheet.unsavedChanges.keepEditing'),
        onConfirm: async () => {
          if (canSave) {
            await handleSave();
          }
          onExit();
        },
      });
    },
    [canSave, confirm, editor.isDirty, handleSave, t],
  );

  useImperativeHandle(ref, () => ({ requestExit: handleExit }), [handleExit]);

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
          </>
        }
        onBack={() => handleExit(onBack)}
        onClose={() => handleExit(onClose)}
        showClose={showClose}
      />

      {editor.isViewingHistory ? (
        <div className="flex items-center min-h-[41px] bg-muted text-muted-foreground border-b px-3 py-1.5 text-xs">
          <p>
            {t('spreadsheet.viewingHistory', {
              version: editor.displayedVersionNumber,
            })}
          </p>
        </div>
      ) : (
        <SpreadsheetToolbar
          gridState={editor.displayedGridState}
          onAddRows={editor.addRows}
          onDeleteLastRow={editor.deleteLastRow}
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
          displayValues={editor.displayValues}
          onRowsChange={editor.setRows}
          onMoveColumn={editor.moveColumn}
          readOnly={editor.isViewingHistory}
        />
      </div>

      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={artifact.currentVersionNumber}
          selectedVersionNumber={editor.displayedVersionNumber}
          onSelect={editor.selectVersion}
          onRevert={onRevert}
          disabled={editor.isDirty}
        />
      )}
    </div>
  );
});
