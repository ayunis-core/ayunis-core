import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';
import { useMyPermissions } from '@/features/permissions';

export default function KnowledgeBasesEmptyState() {
  const { t } = useTranslation('knowledge-bases');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  // Assume can-create while permissions load (matching CreateKnowledgeBaseDialog)
  // so the prompt doesn't flicker; drop the create copy/action only once we know
  // the member lacks the permission (they can still read KBs shared with them).
  const canCreate = isLoadingPermissions || can('manage_knowledge_bases');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
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
  );
}
