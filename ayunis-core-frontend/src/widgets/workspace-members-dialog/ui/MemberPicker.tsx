import { Fragment, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { WorkspaceGrantLevel } from '@/features/workspaces';
import type { ShareCandidatesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  filterOptionGroups,
  hasOrganization,
  isSameOption,
  shareOptionGroups,
  withoutCoveredPeople,
  type ShareOption,
  type ShareOptionCopy,
  type ShareOptionGroup,
} from '@/widgets/workspace-members-dialog/lib/share-options';
import { AccessSelect } from './AccessSelect';

export interface ShareSelection {
  organization: boolean;
  userIds: string[];
  teamIds: string[];
  accessLevel: WorkspaceGrantLevel;
}

function useOptionCopy(): ShareOptionCopy {
  const { t } = useTranslation('workspace-sharing');
  return {
    organizationGroup: t('picker.groups.organization'),
    teamsGroup: t('picker.groups.teams'),
    noTeamGroup: t('picker.groups.noTeam'),
    organization: t('picker.organization'),
    team: (name) => t('picker.team', { name }),
    people: (count) => t('picker.people', { count }),
  };
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
  container: RefObject<HTMLDivElement | null>;
  emptyText: string;
}>) {
  const { t } = useTranslation('workspace-sharing');
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
                data-testid="share-picker-input"
                placeholder={options.length > 0 ? '' : t('picker.placeholder')}
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef} container={container}>
        <ComboboxEmpty>{query ? t('picker.noMatch') : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(group: ShareOptionGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.label}</ComboboxLabel>
              <ComboboxCollection>
                {(option: ShareOption) => (
                  <ComboboxItem
                    key={`${option.kind}-${option.value}`}
                    value={option}
                    data-testid={`share-option-${option.value}`}
                  >
                    <span>{option.label}</span>
                    {'detail' in option && (
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

export function MemberPicker({
  candidates,
  isInviting,
  emptyText,
  onInvite,
}: Readonly<{
  candidates: ShareCandidatesResponseDto;
  isInviting: boolean;
  emptyText?: string;
  onInvite: (selection: ShareSelection, onInvited: () => void) => void;
}>) {
  const { t } = useTranslation('workspace-sharing');
  const copy = useOptionCopy();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ShareOption[]>([]);
  const [accessLevel, setAccessLevel] = useState<WorkspaceGrantLevel>('use');
  const organization = hasOrganization(selected);
  const groups = shareOptionGroups(candidates, selected, copy);

  if (groups.length === 0 && selected.length === 0 && !emptyText) return null;
  return (
    <div ref={containerRef} className="space-y-3 border-b pb-4">
      <Label>{t('picker.label')}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <ShareCombobox
          groups={groups}
          selected={selected}
          onSelectedChange={(options) =>
            setSelected(withoutCoveredPeople(options))
          }
          container={containerRef}
          emptyText={emptyText ?? t('picker.noMatch')}
        />
        <AccessSelect
          value={organization ? 'use' : accessLevel}
          onChange={setAccessLevel}
          ariaLabel={t('picker.levelLabel')}
          className="sm:w-40"
          disabled={organization}
          testId="share-picker-level"
        />
        <Button
          disabled={selected.length === 0 || isInviting}
          data-testid="share-picker-invite"
          onClick={() =>
            onInvite(
              {
                organization,
                userIds: selected
                  .filter(({ kind }) => kind === 'person')
                  .map(({ value }) => value),
                teamIds: selected
                  .filter(({ kind }) => kind === 'team')
                  .map(({ value }) => value),
                accessLevel: organization ? 'use' : accessLevel,
              },
              () => setSelected([]),
            )
          }
        >
          {t('picker.invite')}
        </Button>
      </div>
    </div>
  );
}
