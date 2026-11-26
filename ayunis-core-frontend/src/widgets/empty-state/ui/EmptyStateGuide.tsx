import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import { EmptyStateSectionHeading } from './EmptyStateSectionHeading';

interface EmptyStateGuideProps {
  action?: ReactNode;
  helpPath?: string;
  suggestions?: ReactNode;
  guide?: ReactNode;
}

export function EmptyStateGuide({
  action,
  helpPath,
  suggestions,
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
      {suggestions}
      {guide && (
        <div className="mt-10 w-full text-left">
          <EmptyStateSectionHeading icon={Sparkles}>
            {t('emptyState.askHowItWorks')}
          </EmptyStateSectionHeading>
          {guide}
        </div>
      )}
    </>
  );
}
