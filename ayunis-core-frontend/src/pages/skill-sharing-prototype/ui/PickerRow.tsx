import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { PickerOption } from '@/pages/skill-sharing-prototype/model/types';

export function PickerRow({
  option,
  isSelected,
  onToggle,
}: Readonly<{
  option: PickerOption;
  isSelected: boolean;
  onToggle: () => void;
}>) {
  const id = `pick-${option.id}`;

  return (
    <Item asChild variant="outline" size="sm" className="cursor-pointer">
      <label htmlFor={id}>
        <Checkbox id={id} checked={isSelected} onCheckedChange={onToggle} />
        <ItemContent>
          <ItemTitle>{option.title}</ItemTitle>
          <ItemDescription className="line-clamp-1">
            {option.description}
          </ItemDescription>
        </ItemContent>
      </label>
    </Item>
  );
}
