import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Download, Pencil } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { showError, showSuccess } from '@/shared/lib/toast';

export function RecordingExportActions({
  onEdit,
  onCopy,
  onDownload,
  downloadLabel,
  testIdPrefix,
}: Readonly<{
  onEdit: () => void;
  onCopy: () => Promise<void>;
  onDownload: () => void;
  downloadLabel: string;
  testIdPrefix: string;
}>) {
  const { t } = useTranslation('recordings');

  async function copy() {
    try {
      await onCopy();
      showSuccess(t('detail.export.copied'));
    } catch {
      showError(t('detail.export.copyError'));
    }
  }

  return (
    <div className="flex items-center gap-1">
      <IconAction
        label={t('detail.summary.edit.label')}
        onClick={onEdit}
        testId={`${testIdPrefix}-edit`}
      >
        <Pencil />
      </IconAction>
      <IconAction
        label={t('detail.export.copy')}
        onClick={() => void copy()}
        testId={`${testIdPrefix}-copy`}
      >
        <Copy />
      </IconAction>
      <IconAction
        label={downloadLabel}
        onClick={onDownload}
        testId={`${testIdPrefix}-download`}
      >
        <Download />
      </IconAction>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  testId,
  children,
}: Readonly<{
  label: string;
  onClick: () => void;
  testId: string;
  children: ReactNode;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          data-testid={testId}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
