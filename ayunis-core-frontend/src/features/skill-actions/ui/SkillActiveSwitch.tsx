import { useTranslation } from 'react-i18next';
import { ActiveSwitch } from '@/shared/ui/active-switch/ActiveSwitch';
import { useSetSkillActivation } from '@/features/skill-actions/api/useSetSkillActivation';

export function SkillActiveSwitch({
  skillId,
  isActive,
  testId,
}: Readonly<{ skillId: string; isActive: boolean; testId?: string }>) {
  const { t } = useTranslation('skills');
  const setActivation = useSetSkillActivation();

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
