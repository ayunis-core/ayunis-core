import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, UserPlus, Users } from 'lucide-react';
import { BulkInviteDialog } from '@/features/bulk-user-invite';
import SingleInviteDialog from './SingleInviteDialog';

export default function InviteMenuButton() {
  const { t } = useTranslation('admin-settings-users');
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" data-testid="invite-menu-trigger">
            {t('inviteDialog.inviteUser')}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSingleInviteOpen(true)}>
            <UserPlus />
            {t('inviteMenu.inviteOne')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setBulkInviteOpen(true)}
            data-testid="bulk-invite-menu-item"
          >
            <Users />
            {t('inviteMenu.inviteMany')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SingleInviteDialog
        open={singleInviteOpen}
        onOpenChange={setSingleInviteOpen}
      />
      <BulkInviteDialog
        open={bulkInviteOpen}
        onOpenChange={setBulkInviteOpen}
      />
    </>
  );
}
