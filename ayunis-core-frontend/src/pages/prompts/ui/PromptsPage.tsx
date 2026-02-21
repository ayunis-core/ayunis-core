import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreatePromptDialog from './CreatePromptDialog';
import PromptCard from './PromptCard';
import type { Prompt } from '../model/openapi';
import PromptsEmptyState from './PromptsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';

interface PromptsPageProps {
  prompts: Prompt[];
}

export default function PromptsPage({ prompts }: Readonly<PromptsPageProps>) {
  const { t } = useTranslation('prompts');

  if (prompts.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              title={t('page.title')}
              action={<CreatePromptDialog />}
            />
          }
        >
          <PromptsEmptyState />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={t('page.title')}
            action={<CreatePromptDialog />}
          />
        }
        contentArea={
          prompts.length === 0 ? (
            <PromptsEmptyState />
          ) : (
            <div className="space-y-3">
              {prompts.map((prompt) => {
                return <PromptCard key={prompt.id} prompt={prompt} />;
              })}
            </div>
          )
        }
      />
    </AppLayout>
  );
}
