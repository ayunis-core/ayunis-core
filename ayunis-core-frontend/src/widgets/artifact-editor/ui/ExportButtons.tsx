import { Button } from '@/shared/ui/shadcn/button';
import { FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExportButtonsProps {
  onExport: (format: 'docx' | 'pdf') => void;
}

export function ExportButtons({ onExport }: ExportButtonsProps) {
  const { t } = useTranslation('artifacts');

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        onClick={() => onExport('docx')}
      >
        <FileDown className="mr-1 size-3.5" />
        {t('export.word')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        onClick={() => onExport('pdf')}
      >
        <FileDown className="mr-1 size-3.5" />
        {t('export.pdf')}
      </Button>
    </div>
  );
}
