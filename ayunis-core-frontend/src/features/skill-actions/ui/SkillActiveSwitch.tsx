import { useTranslation } from 'react-i18next';
import { ActiveSwitch } from '@/shared/ui/active-switch/ActiveSwitch';
import { useSetSkillActivation } from '@/features/skill-actions/api/useSetSkillActivation';
import { AlwaysActiveBadge } from './AlwaysActiveBadge';

export function SkillActiveSwitch({
  skillId,
  isActive,
  isMandatory = false,
  testId,
}: Readonly<{
  skillId: string;
  isActive: boolean;
  isMandatory?: boolean;
  testId?: string;
}>) {
  const { t } = useTranslation('skills');
  const setActivation = useSetSkillActivation();

  if (isMandatory) {
    return <AlwaysActiveBadge testId={testId && `${testId}-always`} />;
  }
  return (
    <ActiveSwitch
      checked={isActive}
      onCheckedChange={(checked) =>
        setActivation.mutate({ id: skillId, isActive: checked })
      }
      label={t('card.activeSwitchLabel')}
      tooltip={isActive ? t('card.activeOn') : t('card.activeOff')}
      disabled={setActivation.isPending}
      testId={testId}
    />
  );
}
