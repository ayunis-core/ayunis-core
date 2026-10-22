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
import type { PrototypeSkill } from '@/widgets/sharing-prototype/model/types';
import { useDeleteWithConfirmation } from '@/pages/skill-sharing-prototype/model/useDeleteWithConfirmation';
import { DeleteSkillButton } from './DeleteSkillButton';

export function WorkspaceOwnSkillActions({
  skill,
}: Readonly<{ skill: PrototypeSkill }>) {
  const { inactiveSkillIds } = usePrototypeState();
  const deleteWithConfirmation = useDeleteWithConfirmation();
  const isActive = !inactiveSkillIds.includes(skill.id);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Switch
                checked={isActive}
                aria-label="Fähigkeit aktiv"
                onCheckedChange={() => toggleSkillActive(skill.id)}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Aktive Fähigkeiten können vom Assistenten bei Bedarf in Chats dieses
            Arbeitsbereichs aktiviert werden. Anweisungen und Ressourcen werden
            erst bei der Aktivierung geladen. Inaktive Fähigkeiten können nicht
            aktiviert werden.
          </TooltipContent>
        </Tooltip>
      </div>
      <DeleteSkillButton onClick={() => deleteWithConfirmation(skill)} />
    </>
  );
}
