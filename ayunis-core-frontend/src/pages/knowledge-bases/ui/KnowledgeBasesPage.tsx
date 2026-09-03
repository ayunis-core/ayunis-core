import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import KnowledgeBaseCard from './KnowledgeBaseCard';
import KnowledgeBasesEmptyState from './KnowledgeBasesEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { useTranslation } from 'react-i18next';
import { useMyPermissions } from '@/features/permissions';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ayunis/ui/components/tabs';
import { EmptyState } from '@/widgets/empty-state';

interface KnowledgeBasesPageProps {
  knowledgeBases: KnowledgeBase[];
}

export default function KnowledgeBasesPage({
  knowledgeBases,
}: Readonly<KnowledgeBasesPageProps>) {
  const { t } = useTranslation('knowledge-bases');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const canCreate = isLoadingPermissions || can('manage_knowledge_bases');
  const [inactiveIds, setInactiveIds] = useState<string[]>([]);

  function setActive(knowledgeBaseId: string, isActive: boolean) {
    setInactiveIds((current) =>
      isActive
        ? current.filter((id) => id !== knowledgeBaseId)
        : [...current, knowledgeBaseId],
    );
  }

  function renderCards(items: KnowledgeBase[]) {
    return (
      <div className="space-y-3">
        {items.map((kb) => (
          <KnowledgeBaseCard
            key={kb.id}
            knowledgeBase={kb}
            isActive={!inactiveIds.includes(kb.id)}
            onActiveChange={(isActive) => setActive(kb.id, isActive)}
          />
        ))}
      </div>
    );
  }

  const personalKnowledgeBases = knowledgeBases
    .filter((kb) => !kb.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sharedKnowledgeBases = knowledgeBases
    .filter((kb) => kb.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const headerAction = (
    <div className="flex gap-2">
      <HelpLink path="knowledge-collections/" />
      <OnboardingTourTarget name={TOUR_TARGET.createKnowledgeBase}>
        <CreateKnowledgeBaseDialog />
      </OnboardingTourTarget>
    </div>
  );

  if (knowledgeBases.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              breadcrumbs={[{ label: t('page.title') }]}
              action={headerAction}
            />
          }
        >
          <KnowledgeBasesEmptyState />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={headerAction}
          />
        }
        contentArea={
          <Tabs defaultValue="personal" className="w-full">
            <TabsList>
              <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
              <TabsTrigger value="shared">{t('tabs.shared')}</TabsTrigger>
            </TabsList>
            <p className="mt-4 max-w-prose text-sm text-muted-foreground">
              {t('list.activeHint')}
            </p>
            <TabsContent value="personal" className="mt-4">
              {personalKnowledgeBases.length === 0 ? (
                <EmptyState
                  title={t('emptyState.personal.title')}
                  description={
                    canCreate
                      ? t('emptyState.personal.description')
                      : t('emptyState.noAccessDescription')
                  }
                  action={
                    canCreate ? (
                      <CreateKnowledgeBaseDialog
                        buttonText={t('createDialog.buttonTextFirst')}
                        showIcon={true}
                      />
                    ) : undefined
                  }
                />
              ) : (
                renderCards(personalKnowledgeBases)
              )}
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {sharedKnowledgeBases.length === 0 ? (
                <EmptyState
                  title={t('emptyState.shared.title')}
                  description={t('emptyState.shared.description')}
                />
              ) : (
                renderCards(sharedKnowledgeBases)
              )}
            </TabsContent>
          </Tabs>
        }
      />
    </AppLayout>
  );
}
