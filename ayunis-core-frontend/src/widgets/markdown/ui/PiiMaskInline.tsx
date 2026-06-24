import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { usePiiMasks } from '../model/pii-mask-context';

interface PiiMaskInlineProps {
  readonly token: string;
}

/**
 * Renders a `{{pii:...}}` token: when the thread's mask dictionary knows it,
 * the original value is shown highlighted with an explanatory tooltip;
 * unknown tokens fall back to the literal token text.
 */
export default function PiiMaskInline({ token }: PiiMaskInlineProps) {
  const { t } = useTranslation('chat');
  const entry = usePiiMasks().get(token);

  if (!entry) {
    return <span>{token}</span>;
  }

  const categoryLabel = t(`chat.piiMask.categories.${entry.category}`, {
    defaultValue: t('chat.piiMask.categories.other'),
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="bg-brand/15 text-brand px-1 py-0.5 rounded font-medium">
          {entry.value}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('chat.piiMask.tooltip', { category: categoryLabel })}</p>
      </TooltipContent>
    </Tooltip>
  );
}
