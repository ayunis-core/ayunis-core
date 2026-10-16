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
import { useMyPermissions } from '@/features/permissions';
import { useOwnerOptions } from '@/features/resource-ownership';
import {
  RequestsTabTrigger,
  useHandoverSummary,
} from '@/features/resource-handover';
import { HandoverRequestList } from '@/widgets/handover-requests';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ayunis/ui/components/tabs';
import { EmptyState } from '@/widgets/empty-state';

export type KnowledgeBasesTab = 'personal' | 'shared' | 'requests';

interface KnowledgeBasesPageProps {
  knowledgeBases: KnowledgeBase[];
  tab: KnowledgeBasesTab;
  onTabChange: (tab: KnowledgeBasesTab) => void;
}

function isOwnPersonal(knowledgeBase: KnowledgeBase): boolean {
  return knowledgeBase.ownerType === 'personal';
}

export default function KnowledgeBasesPage({
  knowledgeBases,
  tab,
  onTabChange,
}: Readonly<KnowledgeBasesPageProps>) {
  const { t } = useTranslation('knowledge-bases');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const { options, isLoading: isLoadingOwners } =
    useOwnerOptions('knowledge_base');
  const reviews = useHandoverSummary().knowledge_base;
  const mayReview = reviews.canReview || reviews.isLoading;
  const activeTab = tab === 'requests' && !mayReview ? 'personal' : tab;
  const canCreate =
    isLoadingPermissions ||
    isLoadingOwners ||
    can('manage_own_knowledge') ||
    options.length > 0;

  const personalKnowledgeBases = knowledgeBases
    .filter(isOwnPersonal)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sharedKnowledgeBases = knowledgeBases
    .filter((kb) => !isOwnPersonal(kb))
    .sort((a, b) => a.name.localeCompare(b.name));

  const headerAction = (
    <div className="flex min-w-0 w-full flex-wrap items-center justify-end gap-2">
      <HelpLink path="knowledge-collections/" />
      <OnboardingTourTarget name={TOUR_TARGET.createKnowledgeBase}>
        <CreateKnowledgeBaseDialog
          buttonClassName="max-sm:max-w-full"
          buttonTestId="knowledge-base-create"
        />
      </OnboardingTourTarget>
    </div>
  );

  if (knowledgeBases.length === 0 && !mayReview) {
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
          <Tabs
            value={activeTab}
            onValueChange={(next) => onTabChange(next as KnowledgeBasesTab)}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
              <TabsTrigger
                value="shared"
                data-testid="knowledge-base-tab-shared"
              >
                {t('tabs.shared')}
              </TabsTrigger>
              {reviews.canReview && (
                <RequestsTabTrigger
                  count={reviews.openRequests}
                  testId="knowledge-base-tab-requests"
                />
              )}
            </TabsList>
            <TabsContent value="personal" className="mt-4">
              {personalKnowledgeBases.length === 0 ? (
                <EmptyState
                  title={t('emptyState.personal.title')}
                  description={
                    canCreate
                      ? t('emptyState.personal.description')
                      : t('emptyState.noAccessDescription')
                  }
                  action={
                    canCreate ? (
                      <CreateKnowledgeBaseDialog
                        buttonText={t('createDialog.buttonTextFirst')}
                        showIcon={true}
                      />
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-3">
                  {personalKnowledgeBases.map((kb) => (
                    <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {sharedKnowledgeBases.length === 0 ? (
                <EmptyState
                  title={t('emptyState.shared.title')}
                  description={t('emptyState.shared.description')}
                />
              ) : (
                <div className="space-y-3">
                  {sharedKnowledgeBases.map((kb) => (
                    <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
                  ))}
                </div>
              )}
            </TabsContent>
            {mayReview && (
              <TabsContent value="requests" className="mt-4">
                <HandoverRequestList kind="knowledge_base" />
              </TabsContent>
            )}
          </Tabs>
        }
      />
    </AppLayout>
  );
}
