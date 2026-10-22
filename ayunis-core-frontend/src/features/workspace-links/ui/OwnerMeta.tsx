import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useAuthenticationControllerMe } from '@/shared/api';
import type { LinkedItem } from '@/features/workspace-links/model/types';
import {
  ownerLabel,
  ownerLines,
} from '@/features/workspace-links/lib/owner-copy';

export function OwnerMeta({
  item,
}: Readonly<{ item: Pick<LinkedItem, 'owner' | 'linkedBy'> }>) {
  const { t } = useTranslation('workspace');
  const { data: me } = useAuthenticationControllerMe();
  const label = ownerLabel(item.owner, me?.id);
  const lines = ownerLines(item.owner, item.linkedBy, me?.id);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="max-w-56 truncate text-sm text-muted-foreground"
          data-testid="linked-item-owner"
        >
          {t(label.key, label.values)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {lines.map(({ key, values }) => (
          <p key={key}>{t(key, values)}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
