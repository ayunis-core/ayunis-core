import { Badge } from '@ayunis/ui/components/badge';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  toggleSkillActive,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';

function AlwaysActiveBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary">Immer aktiv</Badge>
      </TooltipTrigger>
      <TooltipContent>
        Ihre Verwaltung hat diese Fähigkeit für alle verpflichtend aktiviert.
      </TooltipContent>
    </Tooltip>
  );
}

export function ActiveSwitch({ skillId }: Readonly<{ skillId: string }>) {
  const { inactiveSkillIds, mandatorySkillIds } = usePrototypeState();
  if (mandatorySkillIds.includes(skillId)) return <AlwaysActiveBadge />;
  const isActive = !inactiveSkillIds.includes(skillId);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Switch
            checked={isActive}
            aria-label="Fähigkeit aktiv"
            onCheckedChange={() => toggleSkillActive(skillId)}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {isActive
          ? 'Aktiv: Ayunis Core kann die Fähigkeit in Chats nutzen.'
          : 'Inaktiv: Ayunis Core nutzt die Fähigkeit nicht in Chats.'}
      </TooltipContent>
    </Tooltip>
  );
}
