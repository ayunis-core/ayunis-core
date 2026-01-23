import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { useTeamsControllerListTeamMembers } from '@/shared/api/generated/ayunisCoreAPI';
import { useUserControllerGetUsersInOrganization } from '@/shared/api/generated/ayunisCoreAPI';
import { useAddTeamMember } from '../api/useAddTeamMember';

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
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { addTeamMember, isAdding } = useAddTeamMember(teamId, () => {
    setSelectedUserId('');
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

  const availableUsers =
    usersResponse?.data?.filter((user) => !existingMemberIds.has(user.id)) ??
    [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId) {
      addTeamMember(selectedUserId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('teamDetail.addMember.title')}</DialogTitle>
            <DialogDescription>
              {t('teamDetail.addMember.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t('teamDetail.addMember.selectUser')}
                />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {t('teamDetail.addMember.noUsersAvailable')}
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('teamDetail.addMember.cancel')}
            </Button>
            <Button type="submit" disabled={!selectedUserId || isAdding}>
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
