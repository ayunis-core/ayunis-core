import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import { useTranslation } from 'react-i18next';
import { Brain, MessageCircleQuestion, Paperclip, Upload } from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';
import { useMyPermissions } from '@/features/permissions';

interface KnowledgeBasesEmptyStateProps {
  chatStarter: ChatStarterDefaults;
}

export default function KnowledgeBasesEmptyState({
  chatStarter,
}: Readonly<KnowledgeBasesEmptyStateProps>) {
  const { t } = useTranslation('knowledge-bases');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  // Assume can-create while permissions load (matching CreateKnowledgeBaseDialog)
  // so the prompt doesn't flicker; drop the create copy/action only once we know
  // the member lacks the permission (they can still read KBs shared with them).
  const canCreate = isLoadingPermissions || can('manage_knowledge_bases');

  return (
    <EmptyState
      testId="knowledge-bases-empty-state"
      icon={Brain}
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
          : t('emptyState.noAccessDescription')
      }
      steps={[
        {
          icon: Upload,
          title: t('emptyState.steps.upload.title'),
          description: t('emptyState.steps.upload.description'),
        },
        {
          icon: Paperclip,
          title: t('emptyState.steps.attach.title'),
          description: t('emptyState.steps.attach.description'),
        },
        {
          icon: MessageCircleQuestion,
          title: t('emptyState.steps.ask.title'),
          description: t('emptyState.steps.ask.description'),
        },
      ]}
      helpPath="knowledge-collections/"
      action={
        canCreate ? (
          <CreateKnowledgeBaseDialog
            buttonText={t('createDialog.buttonTextFirst')}
            showIcon={true}
          />
        ) : undefined
      }
      guide={
        <ChatStarter
          {...chatStarter}
          origin={{ kind: 'feature_guide', feature: 'knowledge_bases' }}
          placeholder={t('emptyState.askPlaceholder')}
        />
      }
    />
  );
}
