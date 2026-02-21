import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import KnowledgeBaseCard from './KnowledgeBaseCard';
import KnowledgeBasesEmptyState from './KnowledgeBasesEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import type { KnowledgeBase } from '../model/openapi';
import { useTranslation } from 'react-i18next';

interface KnowledgeBasesPageProps {
  knowledgeBases: KnowledgeBase[];
}

export default function KnowledgeBasesPage({
  knowledgeBases,
}: Readonly<KnowledgeBasesPageProps>) {
  const { t } = useTranslation('knowledge-bases');

  if (knowledgeBases.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              title={t('page.title')}
              action={<CreateKnowledgeBaseDialog />}
            />
          }
        >
          <KnowledgeBasesEmptyState />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  const sortedKnowledgeBases = [...knowledgeBases].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={t('page.title')}
            action={<CreateKnowledgeBaseDialog />}
          />
        }
        contentArea={
          <div className="space-y-3">
            {sortedKnowledgeBases.map((kb) => (
              <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
            ))}
          </div>
        }
      />
    </AppLayout>
  );
}
