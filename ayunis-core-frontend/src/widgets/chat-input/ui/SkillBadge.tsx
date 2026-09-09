import { Sparkles, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

interface SkillBadgeProps {
  skillName: string;
  onRemove: () => void;
}

export function SkillBadge({ skillName, onRemove }: Readonly<SkillBadgeProps>) {
  const { t } = useTranslation('common');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="max-w-[9rem] min-w-0 cursor-pointer"
          onClick={() => onRemove()}
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          <span className="truncate">{skillName}</span>
          <XIcon className="h-3 w-3 shrink-0" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t('chatInput.deactivateSkillTooltip')}</TooltipContent>
    </Tooltip>
  );
}
