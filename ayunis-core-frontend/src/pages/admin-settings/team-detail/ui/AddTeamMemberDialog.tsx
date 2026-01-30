import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/shared/ui/shadcn/combobox';
import { useTeamsControllerListTeamMembers } from '@/shared/api/generated/ayunisCoreAPI';
import { useUserControllerGetUsersInOrganization } from '@/shared/api/generated/ayunisCoreAPI';
import { useAddTeamMember } from '../api/useAddTeamMember';

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
}: AddTeamMemberDialogProps) {
  const { t } = useTranslation('admin-settings-teams');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { addTeamMember, isAdding } = useAddTeamMember(teamId, () => {
    setSelectedUser(null);
    onOpenChange(false);
  });

  // Fetch all users in the organization
  const { data: usersResponse } = useUserControllerGetUsersInOrganization(
    { limit: 100, offset: 0 },
    { query: { enabled: open } },
  );

  // Fetch existing team members to exclude them from selection
  const { data: membersResponse } = useTeamsControllerListTeamMembers(
    teamId,
    { limit: 100, offset: 0 },
    { query: { enabled: open } },
  );

  const existingMemberIds = new Set(
    membersResponse?.data?.map((m) => m.userId) ?? [],
  );

  const availableUsers: UserOption[] =
    usersResponse?.data
      ?.filter((user) => !existingMemberIds.has(user.id))
      .map((user) => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
      })) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      addTeamMember(selectedUser.value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={containerRef}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('teamDetail.addMember.title')}</DialogTitle>
            <DialogDescription>
              {t('teamDetail.addMember.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-2">
                {t('teamDetail.addMember.noUsersAvailable')}
              </p>
            ) : (
              <Combobox
                items={availableUsers}
                value={selectedUser}
                onValueChange={setSelectedUser}
                isItemEqualToValue={(a, b) => a.value === b.value}
              >
                <ComboboxTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      <ComboboxValue
                        placeholder={t('teamDetail.addMember.selectUser')}
                      />
                    </Button>
                  }
                />
                <ComboboxContent container={containerRef}>
                  <ComboboxInput
                    showTrigger={false}
                    placeholder={t('teamDetail.addMember.searchPlaceholder')}
                  />
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
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('teamDetail.addMember.cancel')}
            </Button>
            <Button type="submit" disabled={!selectedUser || isAdding}>
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
