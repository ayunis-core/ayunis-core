import { Fragment, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@ayunis/ui/components/combobox';
import { useInviteTeams } from '@/pages/admin-settings/users-settings/api/useInviteTeams';

interface TeamOption {
  value: string;
  label: string;
}
interface InviteTeamSelectProps {
  onChange: (teamIds: string[]) => void;
  enabled: boolean;
  disabled: boolean;
}

export function InviteTeamSelect({
  onChange,
  enabled,
  disabled,
}: Readonly<InviteTeamSelectProps>) {
  const { t } = useTranslation('admin-settings-users');
  const [searchQuery, setSearchQuery] = useState('');
  const { teams, isLoading, isError } = useInviteTeams(enabled);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useComboboxAnchor();
  const options = useMemo(
    () =>
      teams
        .filter((team) =>
          team.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .map((team) => ({ value: team.id, label: team.name })),
    [teams, searchQuery],
  );
  return (
    <div ref={containerRef}>
      <Combobox
        items={options}
        multiple
        filter={null}
        onInputValueChange={setSearchQuery}
        defaultValue={[]}
        onValueChange={(items: TeamOption[]) =>
          onChange(items.map((item) => item.value))
        }
        isItemEqualToValue={(a, b) => a.value === b.value}
        disabled={disabled || isLoading || isError}
      >
        <ComboboxChips ref={anchorRef}>
          <ComboboxValue>
            {(items: TeamOption[]) => (
              <Fragment>
                {items.map((item) => (
                  <ComboboxChip key={item.value} aria-label={item.label}>
                    {item.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  data-testid="invite-create-teams"
                  aria-label={t('inviteDialog.teamsLabel')}
                  placeholder={
                    items.length ? '' : t('inviteDialog.teamsPlaceholder')
                  }
                />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchorRef} container={containerRef}>
          <ComboboxEmpty>{t('inviteDialog.noTeamsFound')}</ComboboxEmpty>
          <ComboboxList>
            {(item: TeamOption) => (
              <ComboboxItem
                key={item.value}
                value={item}
                data-testid={`invite-create-team-${item.value}`}
              >
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {t('inviteDialog.teamsLoadError')}
        </p>
      )}
    </div>
  );
}
