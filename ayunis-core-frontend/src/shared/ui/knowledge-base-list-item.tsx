import type { MouseEventHandler, ReactNode } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';

export function KnowledgeBaseListItem({
  title,
  description,
  actions,
  onClick,
  testId,
}: Readonly<{
  title: ReactNode;
  description?: string | null;
  actions: ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  testId?: string;
}>) {
  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      data-testid={testId}
      onClick={onClick}
    >
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description ? <ItemDescription>{description}</ItemDescription> : null}
      </ItemContent>
      <ItemActions onClick={(event) => event.stopPropagation()}>
        {actions}
      </ItemActions>
    </Item>
  );
}
