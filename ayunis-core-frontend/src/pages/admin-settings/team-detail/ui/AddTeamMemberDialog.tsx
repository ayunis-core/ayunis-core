import { Fragment, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Button } from '@ayunis/ui/components/button';
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
import { keepPreviousData } from '@tanstack/react-query';
import { useTeamsControllerListTeamMembers } from '@/shared/api/generated/ayunisCoreAPI';
import { useUserControllerGetUsersInOrganization } from '@/shared/api/generated/ayunisCoreAPI';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useAddTeamMembers } from '../api/useAddTeamMembers';

interface UserOption {
  value: string;
  label: string;
}

interface AddTeamMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTeamMemberDialog({
  teamId,
  open,
  onOpenChange,
}: Readonly<AddTeamMemberDialogProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useComboboxAnchor();

  const { addTeamMembers, isAdding } = useAddTeamMembers(teamId, () => {
    setSelectedUsers([]);
    setSearchQuery('');
    onOpenChange(false);
  });

  // Search users server-side so members beyond the first page are reachable.
  // Keep the previous page's results while a new search is in flight so the
  // list doesn't flash "no users found" between keystrokes.
  const { data: usersResponse } = useUserControllerGetUsersInOrganization(
    {
      limit: 100,
      offset: 0,
      search: debouncedSearch.trim() || undefined,
    },
    { query: { enabled: open, placeholderData: keepPreviousData } },
  );

  // Fetch existing team members to exclude them from selection
  const { data: membersResponse } = useTeamsControllerListTeamMembers(
    teamId,
    { limit: 100, offset: 0 },
    { query: { enabled: open } },
  );

  const existingMemberIds = new Set(
    membersResponse?.data.map((m) => m.userId) ?? [],
  );

  const availableUsers: UserOption[] =
    usersResponse?.data
      .filter((user) => !existingMemberIds.has(user.id))
      .map((user) => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
      })) ?? [];

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (selectedUsers.length > 0) {
      addTeamMembers(selectedUsers.map((u) => u.value));
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedUsers([]);
      setSearchQuery('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('teamDetail.addMember.title')}</DialogTitle>
            <DialogDescription>
              {t('teamDetail.addMember.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4" ref={containerRef}>
            <Combobox
              items={availableUsers}
              multiple
              value={selectedUsers}
              onValueChange={setSelectedUsers}
              isItemEqualToValue={(a, b) => a.value === b.value}
              filter={null}
              onInputValueChange={setSearchQuery}
            >
              <ComboboxChips ref={anchorRef}>
                <ComboboxValue>
                  {(users: UserOption[]) => (
                    <Fragment>
                      {users.map((user) => (
                        <ComboboxChip key={user.value} aria-label={user.label}>
                          {user.label}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        placeholder={
                          users.length > 0
                            ? ''
                            : t('teamDetail.addMember.searchPlaceholder')
                        }
                      />
                    </Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={anchorRef} container={containerRef}>
                <ComboboxEmpty>
                  {t('teamDetail.addMember.noUsersFound')}
                </ComboboxEmpty>
                <ComboboxList>
                  {(item: UserOption) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('teamDetail.addMember.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={selectedUsers.length === 0 || isAdding}
            >
              {isAdding
                ? t('teamDetail.addMember.adding')
                : t('teamDetail.addMember.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
