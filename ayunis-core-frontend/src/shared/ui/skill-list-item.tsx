import type { MouseEventHandler, ReactNode } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';

export function SkillListItem({
  title,
  description,
  actions,
  onClick,
  testId,
}: Readonly<{
  title: ReactNode;
  description: string;
  actions: ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  testId?: string;
}>) {
  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      onClick={onClick}
      data-testid={testId}
    >
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions onClick={(event) => event.stopPropagation()}>
        {actions}
      </ItemActions>
    </Item>
  );
}
