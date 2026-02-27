import AppLayout from '@/layouts/app-layout';
import type {
  KnowledgeBaseResponseDto,
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { SharesTab } from '@/widgets/shares-tab';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { Trash2 } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import { useDeleteKnowledgeBase } from '@/pages/knowledge-bases/api/useDeleteKnowledgeBase';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';
import KnowledgeBasePropertiesCard from './KnowledgeBasePropertiesCard';
import KnowledgeBaseDocumentsCard from './KnowledgeBaseDocumentsCard';

export function KnowledgeBasePage({
  knowledgeBase,
  shares,
  userTeams,
  initialTab = 'config',
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
  initialTab?: 'config' | 'share';
}>) {
  const { t } = useTranslation('knowledge-bases');
  const navigate = useNavigate();
  const { id } = useParams({
    from: '/_authenticated/knowledge-bases/$id',
  });
  const navigateToList = useCallback(() => {
    void navigate({ to: '/knowledge-bases' });
  }, [navigate]);
  const deleteKnowledgeBase = useDeleteKnowledgeBase(navigateToList);
  const { confirm } = useConfirmation();

  const handleTabChange = useCallback(
    (value: string) => {
      void navigate({
        to: '/knowledge-bases/$id',
        params: { id },
        search: value === 'config' ? {} : { tab: value as 'share' },
      });
    },
    [navigate, id],
  );

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

  const isReadOnly = knowledgeBase.isShared;

  const configContent = (
    <div className="grid gap-4">
      <KnowledgeBasePropertiesCard
        knowledgeBase={knowledgeBase}
        disabled={isReadOnly}
      />
      <KnowledgeBaseDocumentsCard
        knowledgeBaseId={knowledgeBase.id}
        disabled={isReadOnly}
      />
    </div>
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={knowledgeBase.name}
            badge={
              isReadOnly ? (
                <Badge variant="secondary">{t('shared.badge')}</Badge>
              ) : undefined
            }
            action={
              !isReadOnly ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                      disabled={deleteKnowledgeBase.isPending}
                      aria-label={t('detail.deleteLabel')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('detail.deleteLabel')}</TooltipContent>
                </Tooltip>
              ) : undefined
            }
          />
        }
        contentArea={
          isReadOnly ? (
            configContent
          ) : (
            <Tabs
              value={initialTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="config">
                  {t('tabs.configuration')}
                </TabsTrigger>
                <TabsTrigger value="share">{t('tabs.shares')}</TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="mt-4">
                {configContent}
              </TabsContent>
              <TabsContent value="share" className="mt-4">
                <SharesTab
                  entityType="knowledge_base"
                  entityId={knowledgeBase.id}
                  shares={shares}
                  userTeams={userTeams}
                />
              </TabsContent>
            </Tabs>
          )
        }
      />
    </AppLayout>
  );
}
