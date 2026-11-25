import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, Sparkles, Undo2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

interface ImproveTextButtonProps {
  /** The field's current text, which a rewrite starts from. */
  text: string;
  isPending: boolean;
  /** Starts a rewrite of `sourceText` and calls `onSuccess` with the result. */
  improve: (sourceText: string, onSuccess: (improved: string) => void) => void;
  onImproved: (text: string) => void;
  onPendingChange?: (isPending: boolean) => void;
  testId: string;
}

/**
 * "Improve" next to a text field's label. After a rewrite it offers to keep
 * it, retry from the original wording, or revert to it.
 */
export function ImproveTextButton({
  text,
  isPending,
  improve,
  onImproved,
  onPendingChange,
  testId,
}: Readonly<ImproveTextButtonProps>) {
  const { t } = useTranslation('common');
  const [originalText, setOriginalText] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const hasEnoughToWorkWith = text.trim().length > 0;
  const hasSuggestion = originalText !== null && !isPending;

  function run(sourceText: string) {
    improve(sourceText, (improved) => {
      setOriginalText(sourceText);
      onImproved(improved);
    });
  }

  if (hasSuggestion) {
    return (
      <span className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            onImproved(originalText);
            setOriginalText(null);
          }}
          data-testid={`${testId}-undo`}
        >
          <Undo2 />
          {t('improveText.undo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => run(originalText)}
          data-testid={`${testId}-retry`}
        >
          <RefreshCw />
          {t('improveText.retry')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-brand hover:text-brand"
          onClick={() => setOriginalText(null)}
          data-testid={`${testId}-accept`}
        >
          <Check />
          {t('improveText.accept')}
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
            size="xs"
            className="text-brand hover:text-brand"
            disabled={!hasEnoughToWorkWith || isPending}
            onClick={() => run(text)}
            data-testid={testId}
          >
            <Sparkles />
            {isPending ? (
              <span className="improve-text-shimmer">
                {t('improveText.running')}
              </span>
            ) : (
              t('improveText.action')
            )}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {hasEnoughToWorkWith
          ? t('improveText.tooltip')
          : t('improveText.needsInput')}
      </TooltipContent>
    </Tooltip>
  );
}
