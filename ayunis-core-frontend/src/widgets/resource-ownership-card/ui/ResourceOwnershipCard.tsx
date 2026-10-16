import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  useOwnershipCopy,
  type OwnedResource,
  type OwnedResourceKind,
} from '@/features/resource-ownership';

export function ResourceOwnershipCard({
  kind,
  resource,
}: Readonly<{ kind: OwnedResourceKind; resource: OwnedResource }>) {
  const copy = useOwnershipCopy(kind);

  return (
    <Item
      variant="outline"
      className="border-brand/50"
      data-testid="ownership-card"
    >
      <ItemContent>
        <ItemTitle>{copy.cardTitle(resource)}</ItemTitle>
        <ItemDescription>{copy.cardSentence(resource)}</ItemDescription>
      </ItemContent>
    </Item>
  );
}
