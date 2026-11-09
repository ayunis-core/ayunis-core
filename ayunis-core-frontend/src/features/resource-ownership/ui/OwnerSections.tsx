import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyTeams } from '@/features/permissions';
import {
  groupByOwner,
  type OwnerSectionOwner,
} from '@/features/resource-ownership/lib/owner-sections';
import type { OwnedResource } from '@/features/resource-ownership/model/types';

/** A list split into one headed section per owner. */
export function OwnerSections<T extends OwnedResource & { name: string }>({
  items,
  renderItem,
  testIdPrefix,
}: Readonly<{
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  testIdPrefix: string;
}>) {
  const { t } = useTranslation('ownership');
  const { teams } = useMyTeams();

  const headingOf = (owner: OwnerSectionOwner): string => {
    switch (owner.ownerType) {
      case 'personal':
        return t('section.personal');
      case 'org':
        return t('section.org');
      case 'shared':
        return t('section.shared');
      case 'team': {
        const team = teams.find(({ id }) => id === owner.teamId);
        return team
          ? t('badge.team', { name: team.name })
          : t('owner.unknownTeam');
      }
    }
  };

  return (
    <div className="space-y-6">
      {groupByOwner(items, teams).map((section) => (
        <section
          key={section.key}
          className="space-y-3"
          data-testid={`${testIdPrefix}-section-${section.key.replace(':', '-')}`}
        >
          <h2 className="text-sm font-medium text-muted-foreground">
            {headingOf(section.owner)}
          </h2>
          {section.items.map(renderItem)}
        </section>
      ))}
    </div>
  );
}
