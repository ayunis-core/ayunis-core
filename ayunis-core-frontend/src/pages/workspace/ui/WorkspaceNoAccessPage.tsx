import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';

export function WorkspaceNoAccessPage() {
  const { t } = useTranslation('workspace');
  const { t: tSharing } = useTranslation('workspace-sharing');

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.breadcrumb'), href: '/workspaces' }]}
          />
        }
        contentArea={
          <EmptyHint
            icon={<Lock />}
            title={tSharing('noAccess.title')}
            description={tSharing('noAccess.description')}
            testId="workspace-no-access"
            action={
              <Button variant="outline" asChild>
                <Link to="/workspaces">{tSharing('noAccess.back')}</Link>
              </Button>
            }
          />
        }
      />
    </AppLayout>
  );
}
