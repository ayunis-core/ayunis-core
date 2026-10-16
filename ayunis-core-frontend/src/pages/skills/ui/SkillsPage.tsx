import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import CreateSkillMenu from './CreateSkillMenu';
import MarketplacePromoCard from './MarketplacePromoCard';
import SkillCard from './SkillCard';
import type { Skill } from '@/pages/skills/model/openapi';
import SkillsEmptyState from './SkillsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ayunis/ui/components/tabs';
import { EmptyState } from '@/widgets/empty-state';
import { useMyPermissions } from '@/features/permissions';
import { useOwnerOptions } from '@/features/resource-ownership';
import {
  RequestsTabTrigger,
  useHandoverSummary,
} from '@/features/resource-handover';
import { HandoverRequestList } from '@/widgets/handover-requests';

function isOwnPersonalSkill(skill: Skill): boolean {
  return skill.ownerType === 'personal';
}

export type SkillsTab = 'personal' | 'shared' | 'requests';

interface SkillsPageProps {
  skills: Skill[];
  tab: SkillsTab;
  onTabChange: (tab: SkillsTab) => void;
}

export default function SkillsPage({
  skills,
  tab,
  onTabChange,
}: Readonly<SkillsPageProps>) {
  const { t } = useTranslation('skills');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const { options, isLoading: isLoadingOwners } = useOwnerOptions('skill');
  const reviews = useHandoverSummary().skill;
  const mayReview = reviews.canReview || reviews.isLoading;
  const activeTab = tab === 'requests' && !mayReview ? 'personal' : tab;
  const canCreate =
    isLoadingPermissions ||
    isLoadingOwners ||
    can('manage_own_skills') ||
    options.length > 0;

  const personalSkills = skills
    .filter(isOwnPersonalSkill)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sharedSkills = skills
    .filter((skill) => !isOwnPersonalSkill(skill))
    .sort((a, b) => a.name.localeCompare(b.name));

  // The "pin a skill" tour step anchors on the first active personal skill.
  // With nothing pinnable (no skills yet, or none active) it falls back to the
  // create-skill action so the step always has a visible target.
  const pinTargetSkillId = personalSkills.find((skill) => skill.isActive)?.id;
  const hasPinnableSkill = pinTargetSkillId !== undefined;

  const createSkillAction = (
    <OnboardingTourTarget name={TOUR_TARGET.createSkill}>
      <CreateSkillMenu />
    </OnboardingTourTarget>
  );

  const headerAction = (
    <div className="flex min-w-0 w-full flex-wrap items-center justify-end gap-2">
      <HelpLink path="skills/" />
      {hasPinnableSkill ? (
        createSkillAction
      ) : (
        <OnboardingTourTarget name={TOUR_TARGET.pinSkill}>
          {createSkillAction}
        </OnboardingTourTarget>
      )}
    </div>
  );

  // If no skills at all, show full-screen empty state
  if (skills.length === 0 && !mayReview) {
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
          <SkillsEmptyState />
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
            onValueChange={(next) => onTabChange(next as SkillsTab)}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
              <TabsTrigger value="shared">{t('tabs.shared')}</TabsTrigger>
              {reviews.canReview && (
                <RequestsTabTrigger
                  count={reviews.openRequests}
                  testId="skills-tab-requests"
                />
              )}
            </TabsList>
            {activeTab !== 'requests' && <MarketplacePromoCard />}
            <TabsContent value="personal" className="mt-4">
              {personalSkills.length === 0 ? (
                <EmptyState
                  title={t('emptyState.personal.title')}
                  description={
                    canCreate
                      ? t('emptyState.personal.description')
                      : t('emptyState.noAccessDescription')
                  }
                  action={
                    canCreate ? (
                      <CreateSkillMenu
                        buttonText={t('createDialog.buttonTextFirst')}
                        showIcon
                      />
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-3">
                  {personalSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      pinTourTarget={skill.id === pinTargetSkillId}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {sharedSkills.length === 0 ? (
                <EmptyState
                  title={t('emptyState.shared.title')}
                  description={t('emptyState.shared.description')}
                />
              ) : (
                <div className="space-y-3">
                  {sharedSkills.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </div>
              )}
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
