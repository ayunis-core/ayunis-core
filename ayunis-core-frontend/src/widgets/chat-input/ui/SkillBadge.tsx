import { Sparkles, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

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
          className="cursor-pointer"
          onClick={() => onRemove()}
        >
          <Sparkles className="h-3 w-3" />
          {skillName}
          <XIcon className="h-3 w-3" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t('chatInput.deactivateSkillTooltip')}</TooltipContent>
    </Tooltip>
  );
}
