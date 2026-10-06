import { useState } from 'react';
import { Link2, Search } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { DialogFooter } from '@ayunis/ui/components/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ayunis/ui/components/input-group';
import { GROUP_TITLE } from '@/widgets/sharing-prototype/model/groups';
import type {
  PickerOption,
  PickerSection,
} from '@/pages/skill-sharing-prototype/model/types';
import { EmptyHint } from './EmptyHint';
import { PickerRow } from './PickerRow';

function matches(option: PickerOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${option.title} ${option.description}`.toLowerCase().includes(needle);
}

function filterSections(
  sections: PickerSection[],
  query: string,
): PickerSection[] {
  return sections
    .map((section) => ({
      ...section,
      options: section.options.filter((option) => matches(option, query)),
    }))
    .filter((section) => section.options.length > 0);
}

function PickerSections({
  sections,
  isEverythingLinked,
  emptyDescription,
  selectedIds,
  onToggle,
}: Readonly<{
  sections: PickerSection[];
  isEverythingLinked: boolean;
  emptyDescription: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
}>) {
  if (isEverythingLinked) {
    return (
      <EmptyHint
        icon={<Link2 />}
        title="Alles schon verknüpft"
        description={emptyDescription}
      />
    );
  }
  if (sections.length === 0) {
    return <EmptyHint icon={<Search />} title="Keine Treffer" />;
  }
  return (
    <>
      {sections.map(({ group, options }) => (
        <section key={group} className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {GROUP_TITLE[group]}
          </h3>
          {options.map((option) => (
            <PickerRow
              key={option.id}
              option={option}
              isSelected={selectedIds.includes(option.id)}
              onToggle={() => onToggle(option.id)}
            />
          ))}
        </section>
      ))}
    </>
  );
}

function PickerFooter({
  count,
  onCancel,
  onLink,
}: Readonly<{
  count: number;
  onCancel: () => void;
  onLink: () => void;
}>) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Abbrechen
      </Button>
      <Button disabled={count === 0} onClick={onLink}>
        {count > 1 ? `${count} verknüpfen` : 'Verknüpfen'}
      </Button>
    </DialogFooter>
  );
}

export function LinkPicker({
  sections,
  searchLabel,
  emptyDescription,
  onCancel,
  onLink,
}: Readonly<{
  sections: PickerSection[];
  searchLabel: string;
  emptyDescription: string;
  onCancel: () => void;
  onLink: (ids: string[]) => void;
}>) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
          onChange={(event) => setQuery(event.target.value)}
        />
      </InputGroup>
      <div className="max-h-[45vh] space-y-5 overflow-y-auto pr-1">
        <PickerSections
          sections={filterSections(sections, query)}
          isEverythingLinked={sections.length === 0}
          emptyDescription={emptyDescription}
          selectedIds={selectedIds}
          onToggle={toggle}
        />
      </div>
      <PickerFooter
        count={selectedIds.length}
        onCancel={onCancel}
        onLink={() => onLink(selectedIds)}
      />
    </div>
  );
}
