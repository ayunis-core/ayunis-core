import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Switch } from '@ayunis/ui/components/switch';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useSetSkillMandatory } from '@/pages/skill/api/useSetSkillMandatory';

export function MandatorySkillControl({
  skill,
}: Readonly<{ skill: SkillResponseDto }>) {
  const { t } = useTranslation('skill');
  const setMandatory = useSetSkillMandatory(skill);

  return (
    <Item variant="outline" data-testid="skill-mandatory-control">
      <ItemContent>
        <ItemTitle>{t('mandatory.title')}</ItemTitle>
        <ItemDescription>{t('mandatory.description')}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={skill.isMandatory}
          onCheckedChange={(checked) => setMandatory.mutate(checked)}
          disabled={setMandatory.isPending}
          aria-label={t('mandatory.title')}
          data-testid="skill-mandatory-switch"
        />
      </ItemActions>
    </Item>
  );
}
