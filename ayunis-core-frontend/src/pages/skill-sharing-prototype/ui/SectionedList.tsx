import { Fragment, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { OwnedItem } from '@/widgets/sharing-prototype/model/types';
import {
  visibleSections,
  type ListFilter,
  type ListSection,
} from '@/pages/skill-sharing-prototype/lib/list-sections';
import { EmptyHint } from './EmptyHint';
import { SkillPanelSection } from './SkillPanelSection';

export function SectionedList<T extends OwnedItem>({
  sections,
  filter,
  query,
  requests,
  ownEmpty,
  notFoundTitle,
  renderRow,
}: Readonly<{
  sections: ListSection<T>[];
  filter: ListFilter;
  query: string;
  requests?: ReactNode;
  ownEmpty: ReactNode;
  notFoundTitle: string;
  renderRow: (item: T) => ReactNode;
}>) {
  const shown = visibleSections(sections, filter, query);
  if (shown.length === 0 && !requests) {
    return <EmptyHint icon={<Search />} title={notFoundTitle} />;
  }
  return (
    <div className="space-y-6">
      {requests}
      {shown.map((section) => (
        <SkillPanelSection
          key={section.key}
          title={section.title}
          count={section.items.length || undefined}
        >
          {section.items.length === 0
            ? ownEmpty
            : section.items.map((item) => (
                <Fragment key={item.id}>{renderRow(item)}</Fragment>
              ))}
        </SkillPanelSection>
      ))}
    </div>
  );
}
