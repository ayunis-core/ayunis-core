import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { cn } from '@/shared/lib/shadcn/utils';
import type { TFunction } from 'i18next';

export function DocumentItemStatus({
  isProcessing,
  isProcessingSlow,
  isFailed,
  processingError,
  t,
}: Readonly<{
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
  processingError: string | null | undefined;
  t: TFunction<'knowledge-bases'>;
}>) {
  if (isProcessing) {
    return (
      <span
        className={cn(
          'text-xs',
          isProcessingSlow ? 'text-warning' : 'text-muted-foreground',
        )}
      >
        {isProcessingSlow
          ? t('detail.documents.statusProcessingSlow')
          : t('detail.documents.statusProcessing')}
      </span>
    );
  }

  if (isFailed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs cursor-help">
            {t('detail.documents.statusFailed')}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {processingError ?? t('detail.documents.retryUpload')}
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
