import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { Button } from '@/shared/ui/shadcn/button';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AnonymousButtonProps {
  isAnonymous: boolean;
  onAnonymousChange?: (isAnonymous: boolean) => void;
  isDisabled?: boolean;
}

export function AnonymousButton({
  isAnonymous,
  onAnonymousChange,
  isDisabled,
}: AnonymousButtonProps) {
  const { t } = useTranslation('common');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isAnonymous ? 'default' : 'outline'}
          size="icon"
          disabled={isDisabled || !onAnonymousChange}
          onClick={() => onAnonymousChange?.(!isAnonymous)}
        >
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isAnonymous
          ? t('chatInput.anonymousModeEnabled')
          : t('chatInput.anonymousModeDisabled')}
      </TooltipContent>
    </Tooltip>
  );
}
