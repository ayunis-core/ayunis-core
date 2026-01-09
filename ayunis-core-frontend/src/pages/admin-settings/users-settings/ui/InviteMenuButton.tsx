import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, UserPlus, Users } from 'lucide-react';
import SingleInviteDialog from './SingleInviteDialog';
import BulkInviteDialog from './BulkInviteDialog';

export default function InviteMenuButton() {
  const { t } = useTranslation('admin-settings-users');
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            {t('inviteDialog.inviteUser')}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSingleInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('inviteMenu.inviteOne')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBulkInviteOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
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
