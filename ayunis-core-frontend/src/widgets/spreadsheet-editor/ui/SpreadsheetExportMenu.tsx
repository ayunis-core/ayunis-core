import { FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type { SpreadsheetExportFormat } from '../model/spreadsheet-export';

interface SpreadsheetExportMenuProps {
  readonly onExport: (format: SpreadsheetExportFormat) => void;
  readonly isExporting?: boolean;
  readonly disabled?: boolean;
}

export function SpreadsheetExportMenu({
  onExport,
  isExporting,
  disabled,
}: SpreadsheetExportMenuProps) {
  const { t } = useTranslation('artifacts');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isExporting || disabled}
          aria-label={t('spreadsheet.export.download')}
        >
          <FileDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport('xlsx')}>
          {t('spreadsheet.export.xlsx')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')}>
          {t('spreadsheet.export.csv')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
