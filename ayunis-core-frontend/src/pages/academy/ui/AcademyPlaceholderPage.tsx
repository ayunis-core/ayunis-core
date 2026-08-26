import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@ayunis/ui/components/button';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ACADEMY_LANDING_PAGE_URL } from '@/features/academy';

export default function AcademyPlaceholderPage() {
  const { t } = useTranslation('academy');

  const header = (
    <ContentAreaHeader breadcrumbs={[{ label: t('page.title') }]} />
  );

  return (
    <AppLayout>
      <FullScreenMessageLayout header={header}>
        <div data-testid="academy-placeholder">
          <EmptyState
            title={t('placeholder.title')}
            description={t('placeholder.description')}
            action={
              <Button asChild>
                <a
                  href={ACADEMY_LANDING_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('placeholder.cta')}
                </a>
              </Button>
            }
          />
        </div>
      </FullScreenMessageLayout>
    </AppLayout>
  );
}
