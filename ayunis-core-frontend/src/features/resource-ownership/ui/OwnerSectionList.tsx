import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ListSection } from '@/shared/ui/list-section/ListSection';
import { ownerSections } from '@/features/resource-ownership/lib/owner-sections';
import type { OwnedResource } from '@/features/resource-ownership/model/types';

export function OwnerSectionList<T extends OwnedResource & { id: string }>({
  items,
  testIdPrefix,
  renderItem,
  empty,
}: Readonly<{
  items: T[];
  testIdPrefix: string;
  renderItem: (item: T) => ReactNode;
  empty: ReactNode;
}>) {
  const { t } = useTranslation('resource-ownership');
  if (items.length === 0) return <>{empty}</>;
  return (
    <div className="space-y-6">
      {ownerSections(items).map((section) => (
        <ListSection
          key={section.key}
          title={
            section.teamName === null
              ? t('options.org')
              : t('options.team', { team: section.teamName })
          }
          count={section.items.length}
          testId={`${testIdPrefix}-section-${section.key}`}
        >
          {section.items.map(renderItem)}
        </ListSection>
      ))}
    </div>
  );
}
