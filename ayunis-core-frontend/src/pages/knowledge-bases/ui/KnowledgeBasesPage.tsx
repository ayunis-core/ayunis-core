import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import KnowledgeBaseCard from './KnowledgeBaseCard';
import KnowledgeBasesEmptyState from './KnowledgeBasesEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { useTranslation } from 'react-i18next';
import { OwnerSections } from '@/features/resource-ownership';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';

interface KnowledgeBasesPageProps {
  knowledgeBases: KnowledgeBase[];
}

export default function KnowledgeBasesPage({
  knowledgeBases,
}: Readonly<KnowledgeBasesPageProps>) {
  const { t } = useTranslation('knowledge-bases');
  const headerAction = (
    <div className="flex min-w-0 w-full flex-wrap items-center justify-end gap-2">
      <HelpLink path="knowledge-collections/" />
      <OnboardingTourTarget name={TOUR_TARGET.createKnowledgeBase}>
        <CreateKnowledgeBaseDialog buttonClassName="max-sm:max-w-full" />
      </OnboardingTourTarget>
    </div>
  );

  if (knowledgeBases.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              breadcrumbs={[{ label: t('page.title') }]}
              action={headerAction}
            />
          }
        >
          <KnowledgeBasesEmptyState />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={headerAction}
          />
        }
        contentArea={
          <OwnerSections
            items={knowledgeBases}
            testIdPrefix="knowledge-bases"
            renderItem={(kb) => (
              <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
            )}
          />
        }
      />
    </AppLayout>
  );
}
