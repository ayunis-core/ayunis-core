import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { ItemDescription } from '@/shared/ui/shadcn/item';
import type { TFunction } from 'i18next';

interface DocumentItemStatusProps {
  isWeb: boolean;
  url: string | null | undefined;
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
  processingError: string | null | undefined;
  t: TFunction<'knowledge-bases'>;
}

export function DocumentItemStatus({
  isWeb,
  url,
  isProcessing,
  isProcessingSlow,
  isFailed,
  processingError,
  t,
}: Readonly<DocumentItemStatusProps>) {
  if (isProcessing) {
    const className = isProcessingSlow
      ? 'text-amber-600 dark:text-amber-400'
      : undefined;
    const key = isProcessingSlow
      ? 'detail.documents.statusProcessingSlow'
      : 'detail.documents.statusProcessing';
    return <ItemDescription className={className}>{t(key)}</ItemDescription>;
  }
  if (isFailed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ItemDescription className="text-destructive cursor-help">
            {t('detail.documents.statusFailed')}
          </ItemDescription>
        </TooltipTrigger>
        <TooltipContent>
          {processingError ?? t('detail.documents.retryUpload')}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (isWeb && url) return <ItemDescription>{url}</ItemDescription>;
  return null;
}
