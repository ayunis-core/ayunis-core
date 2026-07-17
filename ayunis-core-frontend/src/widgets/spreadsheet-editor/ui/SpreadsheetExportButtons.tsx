import { FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';

export type SpreadsheetExportFormat = 'xlsx' | 'csv';

interface SpreadsheetExportButtonsProps {
  readonly onExport: (format: SpreadsheetExportFormat) => void;
  readonly isExporting?: boolean;
}

export function SpreadsheetExportButtons({
  onExport,
  isExporting,
}: SpreadsheetExportButtonsProps) {
  const { t } = useTranslation('artifacts');

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        disabled={isExporting}
        onClick={() => onExport('xlsx')}
      >
        <FileDown className="mr-1 size-3.5" />
        {t('spreadsheet.export.xlsx')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        disabled={isExporting}
        onClick={() => onExport('csv')}
      >
        <FileDown className="mr-1 size-3.5" />
        {t('spreadsheet.export.csv')}
      </Button>
    </div>
  );
}
