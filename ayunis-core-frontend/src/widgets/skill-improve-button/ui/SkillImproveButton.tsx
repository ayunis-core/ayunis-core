import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, Sparkles, Undo2 } from 'lucide-react';
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
  const [originalText, setOriginalText] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(improve.isPending);
  }, [improve.isPending, onPendingChange]);

  const ownText = field === 'instructions' ? instructions : trigger;
  const hasEnoughToWorkWith = ownText.trim().length > 0;
  const hasSuggestion = originalText !== null && !improve.isPending;

  function run(sourceText: string) {
    improve.mutate(
      {
        field,
        name,
        trigger: field === 'trigger' ? sourceText : trigger,
        instructions: field === 'instructions' ? sourceText : instructions,
      },
      {
        onSuccess: (text) => {
          setOriginalText(sourceText);
          onImproved(text);
        },
      },
    );
  }

  if (hasSuggestion) {
    return (
      <span className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-brand hover:text-brand h-7 px-2 text-xs"
          onClick={() => setOriginalText(null)}
          data-testid={`improve-skill-${field}-accept`}
        >
          <Check className="size-3.5" />
          {t('improve.accept')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => run(originalText)}
          data-testid={`improve-skill-${field}-retry`}
        >
          <RefreshCw className="size-3.5" />
          {t('improve.retry')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            onImproved(originalText);
            setOriginalText(null);
          }}
          data-testid={`improve-skill-${field}-undo`}
        >
          <Undo2 className="size-3.5" />
          {t('improve.undo')}
        </Button>
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-brand hover:text-brand h-7 px-2 text-xs"
            disabled={disabled || !hasEnoughToWorkWith || improve.isPending}
            onClick={() => run(ownText)}
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
  );
}
