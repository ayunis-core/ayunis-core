import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  usePiiMasks,
  usePiiUnmaskRequest,
} from '@/widgets/markdown/model/pii-mask-context';

interface PiiMaskInlineProps {
  readonly token: string;
}

/**
 * Renders a `{{pii:...}}` token: when the thread's mask dictionary knows it,
 * the original value is shown highlighted with an explanatory tooltip;
 * unknown tokens fall back to the literal token text. Manually unmasked
 * entries render as plain text. Where an unmask handler is provided (the
 * chat page), masked entries are clickable to request unmasking.
 */
export default function PiiMaskInline({ token }: PiiMaskInlineProps) {
  const { t } = useTranslation('chat');
  const entry = usePiiMasks().get(token);
  const onUnmaskRequest = usePiiUnmaskRequest();

  if (!entry) {
    return <span>{token}</span>;
  }

  if (entry.unmasked) {
    return <span data-testid="pii-mask-unmasked">{entry.value}</span>;
  }

  const categoryLabel = t(`chat.piiMask.categories.${entry.category}`, {
    defaultValue: t('chat.piiMask.categories.other'),
  });

  const tooltip = onUnmaskRequest
    ? t('chat.piiMask.tooltipClickable', { category: categoryLabel })
    : t('chat.piiMask.tooltip', { category: categoryLabel });

  const highlight = 'bg-brand/15 text-brand px-1 py-0.5 rounded font-medium';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onUnmaskRequest ? (
          <button
            type="button"
            data-testid="pii-mask"
            className={`${highlight} cursor-pointer hover:bg-brand/25`}
            onClick={() => onUnmaskRequest(entry)}
          >
            {entry.value}
          </button>
        ) : (
          <span data-testid="pii-mask" className={highlight}>
            {entry.value}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
