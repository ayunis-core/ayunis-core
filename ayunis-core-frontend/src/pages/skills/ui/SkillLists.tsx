import { useTranslation } from 'react-i18next';
import { Building2, Search, Sparkles } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import { OwnerSectionList } from '@/features/resource-ownership';
import type { Skill } from '@/pages/skills/model/openapi';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';
import { SkillRow } from './SkillRow';
import { SkillStarterCard } from './SkillStarterCard';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';

export function OwnSkillList({
  skills,
  isSearching,
  canCreateOwn,
  pinTargetId,
}: Readonly<{
  skills: Skill[];
  isSearching: boolean;
  canCreateOwn: boolean;
  pinTargetId?: string;
}>) {
  const { t } = useTranslation('skills');
  if (skills.length === 0 && isSearching) {
    return <EmptyHint icon={<Search />} title={t('emptyState.search')} />;
  }
  if (skills.length === 0) {
    return canCreateOwn ? (
      <SkillStarterCard />
    ) : (
      <EmptyHint
        icon={<Sparkles />}
        title={t('emptyState.personal.title')}
        description={t('emptyState.noAccessDescription')}
      />
    );
  }
  return (
    <ItemGroup className="gap-2">
      {skills.map((skill) =>
        skill.id === pinTargetId ? (
          <OnboardingTourTarget key={skill.id} name={TOUR_TARGET.pinSkill}>
            <SkillRow skill={skill} />
          </OnboardingTourTarget>
        ) : (
          <SkillRow key={skill.id} skill={skill} />
        ),
      )}
    </ItemGroup>
  );
}

export function SharedSkillList({
  skills,
  isSearching,
}: Readonly<{ skills: Skill[]; isSearching: boolean }>) {
  const { t } = useTranslation('skills');
  return (
    <OwnerSectionList
      items={skills}
      testIdPrefix="skills"
      renderItem={(skill) => (
        <SkillRow key={skill.id} skill={skill} showSubmittedBy />
      )}
      empty={
        isSearching ? (
          <EmptyHint icon={<Search />} title={t('emptyState.search')} />
        ) : (
          <EmptyHint
            icon={<Building2 />}
            title={t('emptyState.shared.title')}
            description={t('emptyState.shared.description')}
            testId="skills-shared-empty"
          />
        )
      }
    />
  );
}
