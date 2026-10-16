import AppLayout from '@/layouts/app-layout';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import {
  ResourceOwnershipCard,
  showsOwnershipCard,
} from '@/widgets/resource-ownership-card';
import { ReadOnlyBadge } from '@/features/resource-ownership';
import {
  LinkedWorkspacesSection,
  useLinkedDeleteHint,
} from '@/features/workspace-links';
import {
  HandoverButton,
  HandoverRequestArea,
  useHandoverState,
  type HandoverState,
} from '@/features/resource-handover';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
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
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { KnowledgeBasePropertiesCard } from '@/widgets/resource-properties-card';
import KnowledgeBaseDocumentsCard from './KnowledgeBaseDocumentsCard';
import { KnowledgeBaseActiveSwitch } from '@/widgets/knowledge-base-activation-toggle';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useQueryClient } from '@tanstack/react-query';
import {
  knowledgeBasesControllerUpdate,
  getKnowledgeBasesControllerFindAllQueryKey,
  getKnowledgeBasesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';

function KnowledgeBaseDeleteButton({
  knowledgeBase,
}: Readonly<{ knowledgeBase: KnowledgeBaseResponseDto }>) {
  const { t } = useTranslation('knowledge-bases');
  const navigate = useNavigate();
  const navigateToList = useCallback(() => {
    void navigate({ to: '/knowledge-bases' });
  }, [navigate]);
  const deleteKnowledgeBase = useDeleteKnowledgeBase(
    knowledgeBase.name,
    navigateToList,
  );
  const linked = useLinkedDeleteHint('knowledgeBase', knowledgeBase.id, true);
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t('detail.confirmDelete.title'),
      description: t('detail.confirmDelete.description', {
        title: knowledgeBase.name,
        hint: linked.hint,
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteKnowledgeBase.isPending || !linked.isKnown}
          aria-label={t('detail.deleteLabel')}
          data-testid="knowledge-base-detail-delete"
        >
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('detail.deleteLabel')}</TooltipContent>
    </Tooltip>
  );
}

function KnowledgeBaseOwnershipSection({
  knowledgeBase,
  handover,
  onDecided,
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
  handover: HandoverState;
  onDecided: () => Promise<void>;
}>) {
  const reviewedFor = handover.isReviewing
    ? handover.pending?.requestedBy.name
    : undefined;
  return (
    <>
      {(handover.isReviewing
        ? reviewedFor !== undefined
        : showsOwnershipCard(knowledgeBase)) && (
        <ResourceOwnershipCard
          kind="knowledge_base"
          resource={knowledgeBase}
          reviewedFor={reviewedFor}
        />
      )}
      <HandoverRequestArea
        kind="knowledge_base"
        pending={handover.pending}
        onDecided={onDecided}
      />
    </>
  );
}

function KnowledgeBaseConfiguration({
  knowledgeBase,
  handover,
  onDecided,
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
  handover: HandoverState;
  onDecided: () => Promise<void>;
}>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = knowledgeBase.viewer?.canEdit ?? false;

  return (
    <div className="grid gap-4">
      <KnowledgeBaseOwnershipSection
        knowledgeBase={knowledgeBase}
        handover={handover}
        onDecided={onDecided}
      />
      {canEdit && (
        <KnowledgeBasePropertiesCard
          key={knowledgeBase.id}
          knowledgeBase={{
            name: knowledgeBase.name,
            description: knowledgeBase.description,
          }}
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
      )}
      <OnboardingTourTarget name={TOUR_TARGET.addDocuments}>
        <KnowledgeBaseDocumentsCard
          knowledgeBaseId={knowledgeBase.id}
          disabled={!canEdit}
        />
      </OnboardingTourTarget>
      {!handover.isReviewing && (
        <LinkedWorkspacesSection kind="knowledgeBase" id={knowledgeBase.id} />
      )}
    </div>
  );
}

export function KnowledgeBasePage({
  knowledgeBase,
}: Readonly<{ knowledgeBase: KnowledgeBaseResponseDto }>) {
  const { t } = useTranslation('knowledge-bases');
  const canEdit = knowledgeBase.viewer?.canEdit ?? false;
  const canUse = knowledgeBase.viewer?.canUse ?? true;
  const canDelete = knowledgeBase.viewer?.canDelete ?? false;
  const handover = useHandoverState('knowledge_base', knowledgeBase);
  const navigate = useNavigate();
  const leaveAfterDecision = () =>
    navigate({ to: '/knowledge-bases', search: { tab: 'requests' } });

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/knowledge-bases' },
              { label: knowledgeBase.name },
            ]}
            badge={canEdit ? null : <ReadOnlyBadge />}
            action={
              <>
                <HelpLink path="knowledge-collections/" />
                {canUse && (
                  <KnowledgeBaseActiveSwitch
                    knowledgeBaseId={knowledgeBase.id}
                    isActive={knowledgeBase.isActive}
                    testId="knowledge-base-detail-active-toggle"
                  />
                )}
                {handover.mayHandOver && (
                  <HandoverButton
                    kind="knowledge_base"
                    item={{ id: knowledgeBase.id, name: knowledgeBase.name }}
                  />
                )}
                {canDelete && (
                  <KnowledgeBaseDeleteButton knowledgeBase={knowledgeBase} />
                )}
              </>
            }
          />
        }
        contentArea={
          <KnowledgeBaseConfiguration
            knowledgeBase={knowledgeBase}
            handover={handover}
            onDecided={leaveAfterDecision}
          />
        }
      />
    </AppLayout>
  );
}
