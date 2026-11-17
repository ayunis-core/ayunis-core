import { Fragment, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData } from '@tanstack/react-query';
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
import { DialogFooter } from '@ayunis/ui/components/dialog';
import { Label } from '@ayunis/ui/components/label';
import { useWorkspaceMembersControllerListCandidates } from '@/shared/api/generated/ayunisCoreAPI';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { MemberRoleSelect } from '@/widgets/member-role-select';
import { useAddWorkspaceMembers } from '@/pages/workspace/api/useAddWorkspaceMembers';
import {
  NON_ADMIN_ASSIGNABLE_ROLES,
  WORKSPACE_ADMIN_ONLY_ITEMS,
  WORKSPACE_ROLE_TRANSLATION,
  WORKSPACE_ROLES,
  type WorkspaceRole,
  type WorkspaceRolePermissionSet,
} from '@/pages/workspace/model/workspace-members';

interface UserOption {
  value: string;
  label: string;
}

interface AddWorkspaceMembersFormProps {
  workspaceId: string;
  isAdmin: boolean;
  rolePermissions: readonly WorkspaceRolePermissionSet[] | undefined;
  onDone: () => void;
}

export function AddWorkspaceMembersForm({
  workspaceId,
  isAdmin,
  rolePermissions,
  onDone,
}: Readonly<AddWorkspaceMembersFormProps>) {
  const { t } = useTranslation('workspace');
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [role, setRole] = useState<WorkspaceRole>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useComboboxAnchor();
  const { addWorkspaceMembers, isAdding } = useAddWorkspaceMembers(
    workspaceId,
    onDone,
  );

  // Search server-side so users beyond the first page are reachable, and keep
  // the previous results while a new search is in flight.
  const { data: candidates } = useWorkspaceMembersControllerListCandidates(
    workspaceId,
    { search: debouncedSearch.trim() || undefined },
    { query: { placeholderData: keepPreviousData } },
  );
  const availableUsers: UserOption[] =
    candidates?.map((user) => ({
      value: user.userId,
      label: `${user.name} (${user.email})`,
    })) ?? [];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selectedUsers.length === 0) return;
        addWorkspaceMembers(
          selectedUsers.map((user) => user.value),
          role,
        );
      }}
    >
      <div className="space-y-4 py-4" ref={containerRef}>
        <Combobox
          items={availableUsers}
          multiple
          value={selectedUsers}
          onValueChange={setSelectedUsers}
          isItemEqualToValue={(a, b) => a.value === b.value}
          filter={null}
          onInputValueChange={(value, details) => {
            // Picking an item clears the input; keep the search so several
            // matches can be added in a row.
            if (details.reason === 'item-press') return;
            setSearchQuery(value);
          }}
        >
          <ComboboxChips ref={anchorRef} data-testid="workspace-members-picker">
            <ComboboxValue>
              {(users: UserOption[]) => (
                <Fragment>
                  {users.map((user) => (
                    <ComboboxChip key={user.value} aria-label={user.label}>
                      {user.label}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    data-testid="workspace-members-search"
                    placeholder={
                      users.length > 0 ? '' : t('members.add.searchPlaceholder')
                    }
                  />
                </Fragment>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchorRef} container={containerRef}>
            <ComboboxEmpty>{t('members.add.noUsersFound')}</ComboboxEmpty>
            <ComboboxList>
              {(item: UserOption) => (
                <ComboboxItem
                  key={item.value}
                  value={item}
                  data-testid={`workspace-members-option-${item.value}`}
                >
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <div className="flex items-center justify-between gap-4">
          <Label>{t('members.add.role')}</Label>
          <MemberRoleSelect
            value={role}
            onValueChange={setRole}
            roles={isAdmin ? WORKSPACE_ROLES : NON_ADMIN_ASSIGNABLE_ROLES}
            rolePermissions={rolePermissions}
            adminOnlyItems={WORKSPACE_ADMIN_ONLY_ITEMS}
            translation={WORKSPACE_ROLE_TRANSLATION}
            ariaLabel={t('members.add.role')}
            triggerTestId="workspace-members-add-role"
            testIdPrefix="workspace-members-add-role"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('members.add.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={selectedUsers.length === 0 || isAdding}
          data-testid="workspace-members-add-submit"
        >
          {isAdding ? t('members.add.adding') : t('members.add.submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}
