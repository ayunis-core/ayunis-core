import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Separator } from '@ayunis/ui/components/separator';
import { getHelpCenterUrl } from '@/shared/lib/help-center';

interface EmptyStateGuideProps {
  action?: ReactNode;
  helpPath?: string;
  guide?: ReactNode;
}

export function EmptyStateGuide({
  action,
  helpPath,
  guide,
}: Readonly<EmptyStateGuideProps>) {
  const { t } = useTranslation('common');
  const hasActions = Boolean(action) || helpPath !== undefined;

  return (
    <>
      {hasActions && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {helpPath !== undefined && (
            <Button variant="ghost" asChild>
              <a
                href={getHelpCenterUrl(helpPath)}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="empty-state-help-link"
              >
                {t('emptyState.learnMore')}
                <ArrowUpRight />
              </a>
            </Button>
          )}
        </div>
      )}
      {guide && (
        <div className="mt-10 w-full text-left">
          <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex-1">
              <Separator />
            </div>
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-brand" />
              {t('emptyState.askHowItWorks')}
            </span>
            <div className="flex-1">
              <Separator />
            </div>
          </div>
          {guide}
        </div>
      )}
    </>
  );
}
