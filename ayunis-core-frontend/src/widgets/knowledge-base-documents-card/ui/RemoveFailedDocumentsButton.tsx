import { Button } from '@ayunis/ui/components/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';

export function RemoveFailedDocumentsButton({
  failedCount,
  removeFailedDocuments,
  isRemovingFailed,
}: Readonly<{
  failedCount: number;
  removeFailedDocuments: () => void;
  isRemovingFailed: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { confirm } = useConfirmation();

  if (failedCount === 0) return null;

  return (
    <div className="mb-2 flex justify-end">
      <Button
        data-testid="knowledge-base-remove-failed-documents"
        variant="outline"
        size="sm"
        disabled={isRemovingFailed}
        onClick={() =>
          confirm({
            title: t('detail.documents.confirmRemoveFailed.title'),
            description: t('detail.documents.confirmRemoveFailed.description', {
              count: failedCount,
            }),
            confirmText: t('detail.documents.confirmRemoveFailed.confirmText'),
            cancelText: t('detail.documents.confirmRemoveFailed.cancelText'),
            variant: 'destructive',
            onConfirm: removeFailedDocuments,
          })
        }
      >
        {isRemovingFailed ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 />
        )}
        {t('detail.documents.removeFailed')}
      </Button>
    </div>
  );
}
