import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Search } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { DialogFooter } from '@ayunis/ui/components/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ayunis/ui/components/input-group';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';
import { filterSections } from '@/features/workspace-links/lib/linkable-sections';
import type { LinkableSection } from '@/features/workspace-links/model/types';
import { PickerRow } from './PickerRow';

function PickerSections({
  sections,
  query,
  allLinkedDescription,
  selectedIds,
  onToggle,
}: Readonly<{
  sections: LinkableSection[];
  query: string;
  allLinkedDescription: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
}>) {
  const { t } = useTranslation('workspace');
  if (sections.length === 0) {
    return (
      <EmptyHint
        icon={<Link2 />}
        title={t('links.picker.allLinkedTitle')}
        description={allLinkedDescription}
        testId="link-picker-all-linked"
      />
    );
  }
  const visible = filterSections(sections, query);
  if (visible.length === 0) {
    return <EmptyHint icon={<Search />} title={t('links.picker.noResults')} />;
  }
  return (
    <>
      {visible.map(({ group, items }) => (
        <section key={group} className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t(`links.picker.groups.${group}`)}
          </h3>
          {items.map((item) => (
            <PickerRow
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          ))}
        </section>
      ))}
    </>
  );
}

export function LinkPicker({
  sections,
  isLoading,
  isLinking,
  searchLabel,
  allLinkedDescription,
  onCancel,
  onLink,
}: Readonly<{
  sections: LinkableSection[];
  isLoading: boolean;
  isLinking: boolean;
  searchLabel: string;
  allLinkedDescription: string;
  onCancel: () => void;
  onLink: (ids: string[]) => void;
}>) {
  const { t } = useTranslation('workspace');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const count = selectedIds.length;

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selected) => selected !== id)
        : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label={searchLabel}
          placeholder={searchLabel}
          value={query}
          data-testid="link-picker-search"
          onChange={(event) => setQuery(event.target.value)}
        />
      </InputGroup>
      <div className="max-h-[45vh] space-y-5 overflow-y-auto px-1 py-1">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <PickerSections
            sections={sections}
            query={query}
            allLinkedDescription={allLinkedDescription}
            selectedIds={selectedIds}
            onToggle={toggle}
          />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t('links.picker.cancel')}
        </Button>
        <Button
          disabled={count === 0 || isLinking}
          data-testid="link-picker-submit"
          onClick={() => onLink(selectedIds)}
        >
          {count > 1
            ? t('links.picker.linkCount', { count })
            : t('links.picker.link')}
        </Button>
      </DialogFooter>
    </div>
  );
}
