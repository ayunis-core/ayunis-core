import { useOwnershipCopy } from '@/features/resource-ownership/model/useOwnershipCopy';
import type {
  OwnedResource,
  OwnedResourceKind,
} from '@/features/resource-ownership/model/types';

export function SubmittedByLabel({
  kind,
  resource,
  testId,
}: Readonly<{
  kind: OwnedResourceKind;
  resource: OwnedResource;
  testId?: string;
}>) {
  const label = useOwnershipCopy(kind).submittedByLabel(resource);
  if (!label) return null;
  return (
    <span className="text-xs text-muted-foreground" data-testid={testId}>
      {label}
    </span>
  );
}
