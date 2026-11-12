import AppLayout from '@/layouts/app-layout';
import type {
  KnowledgeBaseResponseDto,
  ShareResponseDto,
  MyTeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { ConfigurationTabs } from '@/widgets/shares-tab';
import { useMyPermissions } from '@/features/permissions';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Trash2 } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import { useDeleteKnowledgeBase } from '@/pages/knowledge-bases/api/useDeleteKnowledgeBase';
import { useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { KnowledgeBasePropertiesCard } from '@/widgets/resource-properties-card';
import KnowledgeBaseDocumentsCard from './KnowledgeBaseDocumentsCard';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import { useQueryClient } from '@tanstack/react-query';
import {
  knowledgeBasesControllerUpdate,
  getKnowledgeBasesControllerFindAllQueryKey,
  getKnowledgeBasesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import {
  OwnerBadge,
  useResourceOwnership,
} from '@/features/resource-ownership';
import { ResourceOwnerCard } from '@/widgets/resource-owner-card';
import { useChangeKnowledgeBaseOwner } from '@/pages/knowledge-base/api';

export function KnowledgeBasePage({
  knowledgeBase,
  shares,
  userTeams,
  initialTab = 'config',
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
  shares: ShareResponseDto[];
  userTeams: MyTeamResponseDto[];
  initialTab?: 'config' | 'share';
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { t: tOwnership } = useTranslation('ownership');
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const { can } = useMyPermissions();
  const canManageKb = can('manage_knowledge_bases');
  const { canManage } = useResourceOwnership('knowledge-base');
  const ownerChange = useChangeKnowledgeBaseOwner(knowledgeBase.id);
  const isCollective =
    knowledgeBase.ownerType === 'team' || knowledgeBase.ownerType === 'org';
  const isManageable = canManage(knowledgeBase);
  const isReadOnly =
    Boolean(knowledgeBase.isShared) || (isCollective && !isManageable);
  // Team and organization knowledge bases cannot be shared.
  const canShare = knowledgeBase.ownerType === 'personal';

  const configContent = (
    <div className="grid gap-4">
      {isManageable && (
        <ResourceOwnerCard
          kind="knowledge-base"
          resource={knowledgeBase}
          onPreview={ownerChange.previewOwnerChange}
          onChange={ownerChange.changeOwner}
        />
      )}
      <KnowledgeBasePropertiesCard
        key={knowledgeBase.id}
        knowledgeBase={{
          name: knowledgeBase.name,
          description: knowledgeBase.description,
        }}
        disabled={isReadOnly || !canManageKb}
        onUpdate={async (data) => {
          await knowledgeBasesControllerUpdate(knowledgeBase.id, data);
          await Promise.all(
            [
              getKnowledgeBasesControllerFindAllQueryKey(
                personalKnowledgeBaseListParams,
              ),
              getKnowledgeBasesControllerFindOneQueryKey(knowledgeBase.id),
            ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
          );
          await router.invalidate();
        }}
      />
      <OnboardingTourTarget name={TOUR_TARGET.addDocuments}>
        <KnowledgeBaseDocumentsCard
          knowledgeBaseId={knowledgeBase.id}
          disabled={isReadOnly || !canManageKb}
        />
      </OnboardingTourTarget>
    </div>
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/knowledge-bases' },
              { label: knowledgeBase.name },
            ]}
            badge={
              knowledgeBase.isShared ? (
                <Badge variant="secondary">{t('shared.badge')}</Badge>
              ) : (
                <OwnerBadge
                  resource={knowledgeBase}
                  testId="knowledge-base-detail-owner-badge"
                />
              )
            }
            action={
              <>
                <KnowledgeBaseActivationToggle
                  knowledgeBaseId={knowledgeBase.id}
                  isActive={knowledgeBase.isActive}
                  testId="knowledge-base-detail-active-toggle"
                  disabled={isCollective && !isManageable}
                  tooltip={
                    isCollective
                      ? tOwnership('activation.managedByOwner')
                      : undefined
                  }
                />
                {!isReadOnly && canManageKb && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive-ghost"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleteKnowledgeBase.isPending}
                        aria-label={t('detail.deleteLabel')}
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('detail.deleteLabel')}</TooltipContent>
                  </Tooltip>
                )}
              </>
            }
          />
        }
        contentArea={
          isReadOnly || !canShare ? (
            configContent
          ) : (
            <ConfigurationTabs
              value={initialTab}
              onValueChange={handleTabChange}
              labels={{
                configuration: t('tabs.configuration'),
                shares: t('tabs.shares'),
              }}
              configuration={configContent}
              entityType="knowledge_base"
              entityId={knowledgeBase.id}
              shares={shares}
              userTeams={userTeams}
            />
          )
        }
      />
    </AppLayout>
  );
}
