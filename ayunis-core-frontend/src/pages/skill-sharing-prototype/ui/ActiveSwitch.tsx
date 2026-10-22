import { Badge } from '@ayunis/ui/components/badge';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  toggleKnowledgeActive,
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
        Das gilt in allen Chats außerhalb von Arbeitsbereichen.
      </TooltipContent>
    </Tooltip>
  );
}

function ActiveToggle({
  isActive,
  label,
  noun,
  onToggle,
}: Readonly<{
  isActive: boolean;
  label: string;
  noun: string;
  onToggle: () => void;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Switch
            checked={isActive}
            aria-label={label}
            onCheckedChange={onToggle}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {isActive
          ? `Aktiv: Ayunis Core kann die ${noun} in Chats nutzen.`
          : `Inaktiv: Ayunis Core nutzt die ${noun} nicht in Chats.`}
      </TooltipContent>
    </Tooltip>
  );
}

export function ActiveSwitch({ skillId }: Readonly<{ skillId: string }>) {
  const { inactiveSkillIds, mandatorySkillIds } = usePrototypeState();
  if (mandatorySkillIds.includes(skillId)) return <AlwaysActiveBadge />;
  return (
    <ActiveToggle
      isActive={!inactiveSkillIds.includes(skillId)}
      label="Fähigkeit aktiv"
      noun="Fähigkeit"
      onToggle={() => toggleSkillActive(skillId)}
    />
  );
}

export function KnowledgeActiveSwitch({
  knowledgeId,
}: Readonly<{ knowledgeId: string }>) {
  const { inactiveKnowledgeIds } = usePrototypeState();
  return (
    <ActiveToggle
      isActive={!inactiveKnowledgeIds.includes(knowledgeId)}
      label="Wissenssammlung aktiv"
      noun="Wissenssammlung"
      onToggle={() => toggleKnowledgeActive(knowledgeId)}
    />
  );
}
