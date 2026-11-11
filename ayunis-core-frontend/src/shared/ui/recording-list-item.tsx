import type { MouseEventHandler, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { RecordingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';

export function RecordingListItem({
  recording,
  actions,
  onClick,
  testId,
}: Readonly<{
  recording: RecordingResponseDto;
  actions?: ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  testId?: string;
}>) {
  const { t } = useTranslation('recordings');
  const created = formatDate(recording.createdAt);

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      data-testid={testId}
      onClick={onClick}
    >
      <ItemContent>
        <ItemTitle>{recording.name}</ItemTitle>
        <ItemDescription>
          {recording.creatorName
            ? t('listItem.createdBy', {
                date: created,
                name: recording.creatorName,
              })
            : t('listItem.created', { date: created })}
        </ItemDescription>
      </ItemContent>
      {actions ? (
        <ItemActions onClick={(event) => event.stopPropagation()}>
          {actions}
        </ItemActions>
      ) : null}
    </Item>
  );
}
