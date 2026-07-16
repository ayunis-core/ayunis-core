import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { VersionHistory } from '@/widgets/artifact-editor';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useSpreadsheetEditorState } from '../model/useSpreadsheetEditorState';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import type { SpreadsheetExportFormat } from './SpreadsheetExportButtons';
import { SpreadsheetExportButtons } from './SpreadsheetExportButtons';

interface SpreadsheetEditorProps {
  readonly artifact: ArtifactResponseDto;
  readonly onSave: (content: string) => void;
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

  const handleExport = (format: SpreadsheetExportFormat) => {
    onExport(
      format,
      editor.isDirty ? editor.getSerializedContent() : undefined,
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
      confirmText: t('spreadsheet.unsavedChanges.saveAndClose'),
      cancelText: t('spreadsheet.unsavedChanges.keepEditing'),
      onConfirm: () => {
        onSave(editor.getSerializedContent());
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
          <SpreadsheetExportButtons
            onExport={handleExport}
            isExporting={isExporting}
          />
          <Button
            variant="default"
            size="sm"
            className="h-8"
            disabled={!editor.isDirty || editor.isViewingHistory}
            onClick={() => onSave(editor.getSerializedContent())}
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
          onAddColumn={editor.addColumn}
          onRenameColumn={editor.renameColumn}
          onDeleteColumn={editor.deleteColumn}
        />
      )}

      {!editor.isValid && (
        <div className="bg-destructive/10 text-destructive border-b px-3 py-1.5 text-xs">
          {t('spreadsheet.invalidContent')}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <SpreadsheetGrid
          columns={editor.displayedGridState.columns}
          rows={editor.displayedGridState.rows}
          displayValues={editor.displayValues}
          onRowsChange={editor.setRows}
          readOnly={editor.isViewingHistory}
        />
      </div>

      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={editor.displayedVersionNumber}
          onSelect={editor.selectVersion}
          onRevert={onRevert}
        />
      )}
    </div>
  );
}
