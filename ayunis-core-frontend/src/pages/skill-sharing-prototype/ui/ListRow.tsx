import type { MouseEventHandler, ReactNode } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';

export function ListRow({
  title,
  description,
  actions,
  onClick,
}: Readonly<{
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
}>) {
  return (
    <Item
      variant="outline"
      className={cn(onClick && 'cursor-pointer hover:bg-accent/50')}
      onClick={onClick}
    >
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description && (
          <ItemDescription className="line-clamp-1">
            {description}
          </ItemDescription>
        )}
      </ItemContent>
      {actions && (
        <ItemActions onClick={(event) => event.stopPropagation()}>
          {actions}
        </ItemActions>
      )}
    </Item>
  );
}
