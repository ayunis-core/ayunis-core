import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';
import { useMyPermissions } from '@/features/permissions';
import { useOwnerOptions } from '@/features/resource-ownership';

export default function KnowledgeBasesEmptyState() {
  const { t } = useTranslation('knowledge-bases');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const { options, isLoading: isLoadingOwners } =
    useOwnerOptions('knowledge_base');
  // Assume can-create while permissions and owner options load (matching
  // CreateKnowledgeBaseDialog) so the prompt doesn't flicker; drop the create
  // copy/action only once we know the member has no owner to create for.
  const canCreate =
    isLoadingPermissions ||
    isLoadingOwners ||
    can('manage_own_knowledge') ||
    options.length > 0;

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
