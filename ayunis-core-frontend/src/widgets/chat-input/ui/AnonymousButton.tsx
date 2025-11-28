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
  isEnforced?: boolean;
}

export function AnonymousButton({
  isAnonymous,
  onAnonymousChange,
  isDisabled,
  isEnforced = false,
}: AnonymousButtonProps) {
  const { t } = useTranslation('common');

  // When enforced by model, always show as active
  const effectiveIsAnonymous = isEnforced || isAnonymous;
  // Disable toggle when enforced (can't turn off) or when explicitly disabled
  const effectiveIsDisabled = isEnforced || isDisabled || !onAnonymousChange;

  function getTooltipContent() {
    if (isEnforced) {
      return t('chatInput.anonymousModeEnforced');
    }
    return effectiveIsAnonymous
      ? t('chatInput.anonymousModeEnabled')
      : t('chatInput.anonymousModeDisabled');
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={effectiveIsAnonymous ? 'default' : 'outline'}
          size="icon"
          disabled={effectiveIsDisabled}
          onClick={() => onAnonymousChange?.(!isAnonymous)}
        >
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{getTooltipContent()}</TooltipContent>
    </Tooltip>
  );
}
