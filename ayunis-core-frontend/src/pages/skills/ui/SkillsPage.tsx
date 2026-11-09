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
import { OwnerSections } from '@/features/resource-ownership';

interface SkillsPageProps {
  skills: Skill[];
}

export default function SkillsPage({ skills }: Readonly<SkillsPageProps>) {
  const { t } = useTranslation('skills');
  const personalSkills = skills
    .filter((skill) => skill.ownerType === 'personal' && !skill.isShared)
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
  if (skills.length === 0) {
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
          <div className="space-y-4">
            <MarketplacePromoCard />
            <OwnerSections
              items={skills}
              testIdPrefix="skills"
              renderItem={(skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  pinTourTarget={skill.id === pinTargetSkillId}
                />
              )}
            />
          </div>
        }
      />
    </AppLayout>
  );
}
