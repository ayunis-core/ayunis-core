import { Fragment, useRef, useState } from 'react';
import { Button } from '@ayunis/ui/components/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@ayunis/ui/components/combobox';
import { Label } from '@ayunis/ui/components/label';
import type { MemberAccess } from '@/widgets/sharing-prototype/model/types';
import { allTeams } from '@/widgets/sharing-prototype/model/access';
import {
  filterOptionGroups,
  hasOrgOption,
  isSameOption,
  peopleCoveredBy,
  shareOptionGroups,
  withoutCoveredPeople,
  type ShareOption,
  type ShareOptionGroup,
} from '@/pages/skill-sharing-prototype/lib/member-options';
import { WorkspaceAccessSelect } from './WorkspaceAccessSelect';

export interface ShareSelection {
  isOrg: boolean;
  personIds: string[];
  teamIds: string[];
  access: MemberAccess;
}

function ShareCombobox({
  groups,
  selected,
  onSelectedChange,
  container,
  emptyText,
}: Readonly<{
  groups: ShareOptionGroup[];
  selected: ShareOption[];
  onSelectedChange: (options: ShareOption[]) => void;
  container: React.RefObject<HTMLDivElement | null>;
  emptyText: string;
}>) {
  const [query, setQuery] = useState('');
  const anchorRef = useComboboxAnchor();

  return (
    <Combobox
      items={groups}
      filteredItems={filterOptionGroups(groups, query)}
      multiple
      value={selected}
      onValueChange={onSelectedChange}
      isItemEqualToValue={isSameOption}
      onInputValueChange={(value, details) => {
        if (details.reason === 'item-press') return;
        setQuery(value);
      }}
    >
      <ComboboxChips ref={anchorRef} className="flex-1">
        <ComboboxValue>
          {(options: ShareOption[]) => (
            <Fragment>
              {options.map((option) => (
                <ComboboxChip
                  key={`${option.kind}-${option.value}`}
                  aria-label={option.label}
                >
                  {option.label}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={
                  options.length > 0 ? '' : 'Person oder Team suchen'
                }
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef} container={container}>
        <ComboboxEmpty>{query ? 'Niemand gefunden' : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(group: ShareOptionGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(option: ShareOption) => (
                  <ComboboxItem
                    key={`${option.kind}-${option.value}`}
                    value={option}
                  >
                    <span>{option.label}</span>
                    {option.detail && (
                      <span className="text-muted-foreground">
                        {option.detail}
                      </span>
                    )}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function WorkspaceMemberPicker({
  excludedPersonIds,
  excludedTeamIds,
  scopeTeamIds,
  includeOrg = false,
  emptyText,
  onAdd,
}: Readonly<{
  excludedPersonIds: string[];
  excludedTeamIds: string[];
  scopeTeamIds?: string[];
  includeOrg?: boolean;
  emptyText?: string;
  onAdd: (selection: ShareSelection) => void;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ShareOption[]>([]);
  const [access, setAccess] = useState<MemberAccess>('use');
  const isOrg = hasOrgOption(selected);
  const groups = shareOptionGroups(
    [...excludedPersonIds, ...peopleCoveredBy(selected)],
    isOrg ? allTeams().map((team) => team.id) : excludedTeamIds,
    scopeTeamIds,
    includeOrg,
  );

  if (groups.length === 0 && !emptyText) return null;
  return (
    <div ref={containerRef} className="space-y-3 border-b pb-4">
      <Label>Personen und Teams einladen</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <ShareCombobox
          groups={groups}
          selected={selected}
          onSelectedChange={(options) =>
            setSelected(withoutCoveredPeople(options))
          }
          container={containerRef}
          emptyText={emptyText ?? 'Niemand gefunden'}
        />
        <WorkspaceAccessSelect
          value={isOrg ? 'use' : access}
          onChange={setAccess}
          ariaLabel="Recht für die Eingeladenen"
          className="sm:w-40"
          disabled={isOrg}
        />
        <Button
          disabled={selected.length === 0}
          onClick={() => {
            onAdd({
              isOrg,
              personIds: selected
                .filter((option) => option.kind === 'person')
                .map((option) => option.value),
              teamIds: selected
                .filter((option) => option.kind === 'team')
                .map((option) => option.value),
              access,
            });
            setSelected([]);
          }}
        >
          Einladen
        </Button>
      </div>
    </div>
  );
}
