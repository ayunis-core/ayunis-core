import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Switch } from '@ayunis/ui/components/switch';
import { showSuccess } from '@/shared/lib/toast';
import {
  toggleSkillMandatory,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type { PrototypeSkill } from '@/widgets/sharing-prototype/model/types';

export function MandatorySkillControl({
  skill,
}: Readonly<{ skill: PrototypeSkill }>) {
  const { mandatorySkillIds } = usePrototypeState();
  const isMandatory = mandatorySkillIds.includes(skill.id);
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Für alle verpflichtend</ItemTitle>
        <ItemDescription>
          Die Fähigkeit ist dann für alle immer aktiv und lässt sich nicht
          ausschalten.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={isMandatory}
          aria-label="Für alle verpflichtend"
          onCheckedChange={() => {
            toggleSkillMandatory(skill.id);
            showSuccess(
              isMandatory
                ? `„${skill.name}“ lässt sich wieder ausschalten.`
                : `„${skill.name}“ ist jetzt für alle immer aktiv.`,
            );
          }}
        />
      </ItemActions>
    </Item>
  );
}
