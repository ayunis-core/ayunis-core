import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import { WorkspaceMembersDialog } from './WorkspaceMembersDialog';

export function WorkspaceMembersButton({
  workspace,
}: Readonly<{
  workspace: { id: string; name: string; memberCount?: number };
}>) {
  const { t } = useTranslation('workspace-sharing');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="workspace-members">
          <Users />
          {t('members', { count: workspace.memberCount ?? 1 })}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[600px]"
        data-testid="workspace-members-dialog"
      >
        <WorkspaceMembersDialog workspace={workspace} />
      </DialogContent>
    </Dialog>
  );
}
