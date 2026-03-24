import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import KnowledgeBaseCard from './KnowledgeBaseCard';
import KnowledgeBasesEmptyState from './KnowledgeBasesEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import type { KnowledgeBase } from '../model/openapi';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { EmptyState } from '@/widgets/empty-state';

interface KnowledgeBasesPageProps {
  knowledgeBases: KnowledgeBase[];
}

export default function KnowledgeBasesPage({
  knowledgeBases,
}: Readonly<KnowledgeBasesPageProps>) {
  const { t } = useTranslation('knowledge-bases');

  const personalKnowledgeBases = knowledgeBases
    .filter((kb) => !kb.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sharedKnowledgeBases = knowledgeBases
    .filter((kb) => kb.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const headerAction = (
    <div className="flex gap-2">
      <HelpLink path="knowledge-collections/" />
      <CreateKnowledgeBaseDialog />
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
            <TabsContent value="personal" className="mt-4">
              {personalKnowledgeBases.length === 0 ? (
                <EmptyState
                  title={t('emptyState.personal.title')}
                  description={t('emptyState.personal.description')}
                  action={
                    <CreateKnowledgeBaseDialog
                      buttonText={t('createDialog.buttonTextFirst')}
                      showIcon={true}
                    />
                  }
                />
              ) : (
                <div className="space-y-3">
                  {personalKnowledgeBases.map((kb) => (
                    <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {sharedKnowledgeBases.length === 0 ? (
                <EmptyState
                  title={t('emptyState.shared.title')}
                  description={t('emptyState.shared.description')}
                />
              ) : (
                <div className="space-y-3">
                  {sharedKnowledgeBases.map((kb) => (
                    <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        }
      />
    </AppLayout>
  );
}
