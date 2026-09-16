import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Undo2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useImproveSkillText } from '@/features/skill-actions';
import type { ImproveSkillTextDtoField } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface SkillImproveButtonProps {
  field: ImproveSkillTextDtoField;
  name?: string;
  trigger: string;
  instructions: string;
  onImproved: (text: string) => void;
  onPendingChange?: (isPending: boolean) => void;
  disabled?: boolean;
}

export function SkillImproveButton({
  field,
  name,
  trigger,
  instructions,
  onImproved,
  onPendingChange,
  disabled = false,
}: Readonly<SkillImproveButtonProps>) {
  const { t } = useTranslation('skills');
  const improve = useImproveSkillText();
  const [previousText, setPreviousText] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(improve.isPending);
  }, [improve.isPending, onPendingChange]);

  const ownText = field === 'instructions' ? instructions : trigger;
  const hasEnoughToWorkWith = ownText.trim().length > 0;

  function handleImprove() {
    const before = ownText;
    improve.mutate(
      { field, name, trigger, instructions },
      {
        onSuccess: (text) => {
          setPreviousText(before);
          onImproved(text);
        },
      },
    );
  }

  function handleUndo() {
    if (previousText === null) return;
    onImproved(previousText);
    setPreviousText(null);
  }

  return (
    <span className="flex items-center gap-1">
      {previousText !== null && !improve.isPending && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleUndo}
        >
          <Undo2 className="size-3.5" />
          {t('improve.undo')}
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-brand hover:text-brand h-7 px-2 text-xs"
              disabled={disabled || !hasEnoughToWorkWith || improve.isPending}
              onClick={handleImprove}
              data-testid={`improve-skill-${field}`}
            >
              <Sparkles
                className={`size-3.5 ${improve.isPending ? 'skill-improve-spark' : ''}`}
              />
              {improve.isPending ? t('improve.running') : t('improve.action')}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {hasEnoughToWorkWith ? t('improve.tooltip') : t('improve.needsInput')}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
