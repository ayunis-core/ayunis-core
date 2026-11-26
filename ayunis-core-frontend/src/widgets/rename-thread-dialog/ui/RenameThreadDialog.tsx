import { RenameThreadDialog as SharedRenameThreadDialog } from '@ayunis/chat/history';
import { useTranslation } from 'react-i18next';
import { useRenameThread } from '@/features/useRenameThread';
import { showError, showSuccess } from '@/shared/lib/toast';

interface RenameThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  currentTitle: string | null;
}

export function RenameThreadDialog({
  open,
  onOpenChange,
  threadId,
  currentTitle,
}: Readonly<RenameThreadDialogProps>) {
  const { t } = useTranslation('common');
  const { rename, isRenaming } = useRenameThread({
    onSuccess: () => {
      showSuccess(t('sidebar.renameThreadSuccess'));
      onOpenChange(false);
    },
    onError: () => showError(t('sidebar.renameThreadError')),
  });
  return (
    <SharedRenameThreadDialog
      open={open}
      onOpenChange={onOpenChange}
      currentTitle={currentTitle}
      busy={isRenaming}
      onRename={(title) => rename(threadId, title)}
    />
  );
}
