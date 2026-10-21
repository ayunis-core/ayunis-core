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
  reviewedFor,
}: Readonly<{
  kind: OwnedResourceKind;
  resource: OwnedResource;
  reviewedFor?: string;
}>) {
  const copy = useOwnershipCopy(kind);

  return (
    <Item
      variant="outline"
      className="border-brand/50"
      data-testid="ownership-card"
    >
      <ItemContent>
        <ItemTitle>{copy.cardTitle(resource, reviewedFor)}</ItemTitle>
        <ItemDescription>
          {copy.cardSentence(resource, reviewedFor)}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
