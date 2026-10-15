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
import type { Skill } from '@/pages/skills/model/openapi';
import CreateSkillMenu from './CreateSkillMenu';
import { MarketplaceBanner } from './MarketplaceBanner';
import { OwnSkillList, SharedSkillList } from './SkillLists';

export type SkillsTab = 'own' | 'shared' | 'requests';

interface SkillsPageProps {
  skills: Skill[];
  tab: SkillsTab;
  onTabChange: (tab: SkillsTab) => void;
}

function useVisibleSkills(skills: Skill[], query: string) {
  const visible = skills
    .filter((skill) =>
      matchesSearch(query, [skill.name, skill.shortDescription]),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    own: visible.filter((skill) => skill.ownerType === 'personal'),
    shared: visible.filter((skill) => skill.ownerType !== 'personal'),
  };
}

function SkillsHeader({
  query,
  onQueryChange,
  hasPinnableSkill,
}: Readonly<{
  query: string;
  onQueryChange: (query: string) => void;
  hasPinnableSkill: boolean;
}>) {
  const createMenu = (
    <OnboardingTourTarget name={TOUR_TARGET.createSkill}>
      <CreateSkillMenu />
    </OnboardingTourTarget>
  );
  const { t } = useTranslation('skills');
  return (
    <ContentAreaHeader
      breadcrumbs={[{ label: t('page.title') }]}
      action={
        <ListToolbar>
          <ListToolbarSearch
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            data-testid="skills-search"
          />
          <HelpLink path="skills/" />
          {hasPinnableSkill ? (
            createMenu
          ) : (
            <OnboardingTourTarget name={TOUR_TARGET.pinSkill}>
              {createMenu}
            </OnboardingTourTarget>
          )}
        </ListToolbar>
      }
    />
  );
}

export default function SkillsPage({
  skills,
  tab,
  onTabChange,
}: Readonly<SkillsPageProps>) {
  const { t } = useTranslation('skills');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const reviews = useHandoverSummary().skill;
  const [query, setQuery] = useState('');
  const { own, shared } = useVisibleSkills(skills, query);
  const isSearching = query.trim().length > 0;
  const pinTargetId = own.find((skill) => skill.isActive)?.id;
  const mayReview = reviews.canReview || reviews.isLoading;
  const activeTab = tab === 'requests' && !mayReview ? 'own' : tab;

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <SkillsHeader
            query={query}
            onQueryChange={setQuery}
            hasPinnableSkill={pinTargetId !== undefined}
          />
        }
        contentArea={
          <Tabs
            value={activeTab}
            onValueChange={(next) => onTabChange(next as SkillsTab)}
            className="w-full"
          >
            <TabsList>
              <CountTabTrigger
                testIdPrefix="skills-tab"
                value="own"
                label={t('tabs.own')}
                count={own.length}
              />
              <CountTabTrigger
                testIdPrefix="skills-tab"
                value="shared"
                label={t('tabs.shared')}
                count={shared.length}
              />
              {reviews.canReview && (
                <RequestsTabTrigger
                  count={reviews.openRequests}
                  testId="skills-tab-requests"
                />
              )}
            </TabsList>
            {activeTab !== 'requests' && !isSearching && <MarketplaceBanner />}
            <TabsContent value="own" className="mt-4">
              <OwnSkillList
                skills={own}
                isSearching={isSearching}
                canCreateOwn={isLoadingPermissions || can('manage_own_skills')}
                pinTargetId={pinTargetId}
              />
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              <SharedSkillList skills={shared} isSearching={isSearching} />
            </TabsContent>
            {mayReview && (
              <TabsContent value="requests" className="mt-4">
                <HandoverRequestList kind="skill" />
              </TabsContent>
            )}
          </Tabs>
        }
      />
    </AppLayout>
  );
}
