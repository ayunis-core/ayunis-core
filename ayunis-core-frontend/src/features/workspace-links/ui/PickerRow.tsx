import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { LinkableItem } from '@/features/workspace-links/model/types';

export function PickerRow({
  item,
  isSelected,
  onToggle,
}: Readonly<{
  item: LinkableItem;
  isSelected: boolean;
  onToggle: () => void;
}>) {
  const id = `link-pick-${item.id}`;

  return (
    <Item asChild variant="outline" size="sm" className="cursor-pointer">
      <label htmlFor={id} data-testid={`link-picker-item-${item.id}`}>
        <Checkbox id={id} checked={isSelected} onCheckedChange={onToggle} />
        <ItemContent>
          <ItemTitle>{item.name}</ItemTitle>
          {item.description && (
            <ItemDescription>{item.description}</ItemDescription>
          )}
        </ItemContent>
      </label>
    </Item>
  );
}
