import { linkedWorkspaceCount } from '@/widgets/sharing-prototype/model/access';
import type { ResourceKind } from '@/widgets/sharing-prototype/model/types';

export function linkedWarning(resource: ResourceKind, itemId: string): string {
  const count = linkedWorkspaceCount(resource, itemId);
  if (count === 0) return '';
  const places =
    count === 1 ? 'einem Arbeitsbereich' : `${count} Arbeitsbereichen`;
  return ` Sie ist in ${places} verknüpft. Die Mitglieder dort können sie danach nicht mehr nutzen.`;
}
