import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/shadcn/command';
import { cn } from '@/shared/lib/shadcn/utils';
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
  const [popoverOpen, setPopoverOpen] = useState(false);

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

  const selectedUser = availableUsers.find(
    (user) => user.id === selectedUserId,
  );

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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedUser ? (
                    <span className="truncate">
                      {selectedUser.name} ({selectedUser.email})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('teamDetail.addMember.selectUser')}
                    </span>
                  )}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput
                    placeholder={t('teamDetail.addMember.searchPlaceholder')}
                  />
                  <CommandList>
                    {availableUsers.length === 0 ? (
                      <CommandEmpty>
                        {t('teamDetail.addMember.noUsersAvailable')}
                      </CommandEmpty>
                    ) : (
                      <>
                        <CommandEmpty>
                          {t('teamDetail.addMember.noUsersFound')}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.email}`}
                              onSelect={() => {
                                setSelectedUserId(
                                  user.id === selectedUserId ? '' : user.id,
                                );
                                setPopoverOpen(false);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedUserId === user.id
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              <span className="truncate">
                                {user.name} ({user.email})
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
