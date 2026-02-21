import AppLayout from '@/layouts/app-layout';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { Button } from '@/shared/ui/shadcn/button';
import { Trash2 } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import { useDeleteKnowledgeBase } from '@/pages/knowledge-bases/api/useDeleteKnowledgeBase';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import KnowledgeBasePropertiesCard from './KnowledgeBasePropertiesCard';
import KnowledgeBaseDocumentsCard from './KnowledgeBaseDocumentsCard';

export function KnowledgeBasePage({
  knowledgeBase,
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const navigate = useNavigate();
  const navigateToList = useCallback(() => {
    void navigate({ to: '/knowledge-bases' });
  }, [navigate]);
  const deleteKnowledgeBase = useDeleteKnowledgeBase(navigateToList);
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t('detail.confirmDelete.title'),
      description: t('detail.confirmDelete.description', {
        title: knowledgeBase.name,
      }),
      confirmText: t('detail.confirmDelete.confirmText'),
      cancelText: t('detail.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteKnowledgeBase.mutate({ id: knowledgeBase.id });
      },
    });
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={knowledgeBase.name}
            action={
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deleteKnowledgeBase.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        }
        contentArea={
          <div className="grid gap-4">
            <KnowledgeBasePropertiesCard knowledgeBase={knowledgeBase} />
            <KnowledgeBaseDocumentsCard knowledgeBaseId={knowledgeBase.id} />
          </div>
        }
      />
    </AppLayout>
  );
}
