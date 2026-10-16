import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CountTabTrigger } from '@/shared/ui/count-tab-trigger/CountTabTrigger';
import { Tabs, TabsContent, TabsList } from '@ayunis/ui/components/tabs';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar, ListToolbarSearch } from '@/widgets/list-toolbar';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { HandoverRequestList } from '@/widgets/handover-requests';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { matchesSearch } from '@/shared/lib/matches-search';
import { useMyPermissions } from '@/features/permissions';
import {
  RequestsTabTrigger,
  useHandoverSummary,
} from '@/features/resource-handover';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import {
  OwnKnowledgeBaseList,
  SharedKnowledgeBaseList,
} from './KnowledgeBaseLists';

export type KnowledgeBasesTab = 'own' | 'shared' | 'requests';

interface KnowledgeBasesPageProps {
  knowledgeBases: KnowledgeBase[];
  tab: KnowledgeBasesTab;
  onTabChange: (tab: KnowledgeBasesTab) => void;
}

function useVisibleKnowledgeBases(
  knowledgeBases: KnowledgeBase[],
  query: string,
) {
  const visible = knowledgeBases
    .filter((knowledgeBase) =>
      matchesSearch(query, [knowledgeBase.name, knowledgeBase.description]),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    own: visible.filter((item) => item.ownerType === 'personal'),
    shared: visible.filter((item) => item.ownerType !== 'personal'),
  };
}

function KnowledgeBasesHeader({
  query,
  onQueryChange,
}: Readonly<{ query: string; onQueryChange: (query: string) => void }>) {
  const { t } = useTranslation('knowledge-bases');
  return (
    <ContentAreaHeader
      breadcrumbs={[{ label: t('page.title') }]}
      action={
        <ListToolbar>
          <ListToolbarSearch
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            data-testid="knowledge-bases-search"
          />
          <HelpLink path="knowledge-collections/" />
          <OnboardingTourTarget name={TOUR_TARGET.createKnowledgeBase}>
            <CreateKnowledgeBaseDialog
              buttonClassName="max-sm:max-w-full"
              buttonTestId="knowledge-base-create"
            />
          </OnboardingTourTarget>
        </ListToolbar>
      }
    />
  );
}

export default function KnowledgeBasesPage({
  knowledgeBases,
  tab,
  onTabChange,
}: Readonly<KnowledgeBasesPageProps>) {
  const { t } = useTranslation('knowledge-bases');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const reviews = useHandoverSummary().knowledge_base;
  const [query, setQuery] = useState('');
  const { own, shared } = useVisibleKnowledgeBases(knowledgeBases, query);
  const isSearching = query.trim().length > 0;
  const mayReview = reviews.canReview || reviews.isLoading;
  const activeTab = tab === 'requests' && !mayReview ? 'own' : tab;

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <KnowledgeBasesHeader query={query} onQueryChange={setQuery} />
        }
        contentArea={
          <Tabs
            value={activeTab}
            onValueChange={(next) => onTabChange(next as KnowledgeBasesTab)}
            className="w-full"
          >
            <TabsList>
              <CountTabTrigger
                testIdPrefix="knowledge-base-tab"
                value="own"
                label={t('tabs.own')}
                count={own.length}
              />
              <CountTabTrigger
                testIdPrefix="knowledge-base-tab"
                value="shared"
                label={t('tabs.shared')}
                count={shared.length}
              />
              {reviews.canReview && (
                <RequestsTabTrigger
                  count={reviews.openRequests}
                  testId="knowledge-base-tab-requests"
                />
              )}
            </TabsList>
            <TabsContent value="own" className="mt-4">
              <OwnKnowledgeBaseList
                knowledgeBases={own}
                isSearching={isSearching}
                canCreateOwn={
                  isLoadingPermissions || can('manage_own_knowledge')
                }
              />
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              <SharedKnowledgeBaseList
                knowledgeBases={shared}
                isSearching={isSearching}
              />
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
