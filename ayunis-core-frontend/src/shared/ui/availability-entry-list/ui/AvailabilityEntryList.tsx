import { Link } from '@tanstack/react-router';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from '@ayunis/ui/components/item';

export interface AvailabilityEntry {
  id: string;
  name: string;
  description: string;
}

export type AvailabilityEntryTarget = '/skills/$id' | '/knowledge-bases/$id';

const MAX_VISIBLE = 5;

interface AvailabilityEntryListProps {
  entries: AvailabilityEntry[];
  linkTo: AvailabilityEntryTarget;
}

export function AvailabilityEntryList({
  entries,
  linkTo,
}: Readonly<AvailabilityEntryListProps>) {
  const hidden = entries.length - MAX_VISIBLE;
  return (
    <ItemGroup>
      {entries.slice(0, MAX_VISIBLE).map((entry) => (
        <Item
          key={entry.id}
          asChild
          size="sm"
          className="-mx-2 cursor-pointer px-2 py-1.5 text-left hover:bg-accent"
        >
          <Link to={linkTo} params={{ id: entry.id }}>
            <ItemContent>
              <ItemTitle>{entry.name}</ItemTitle>
            </ItemContent>
          </Link>
        </Item>
      ))}
      {hidden > 0 && (
        <span className="pt-1.5 text-xs text-muted-foreground">
          und {hidden} weitere
        </span>
      )}
    </ItemGroup>
  );
}
