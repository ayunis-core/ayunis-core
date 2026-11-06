import { useMyPermissions } from '@/features/permissions';
import { KnowledgeBaseCreateDialog } from '@/widgets/resource-create-dialog';
import { useCreateKnowledgeBase } from '@/pages/knowledge-bases/api/useCreateKnowledgeBase';
import { useResourceOwnership } from '@/features/resource-ownership';

interface CreateKnowledgeBaseDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreateKnowledgeBaseDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
}: Readonly<CreateKnowledgeBaseDialogProps>) {
  const { createKnowledgeBase } = useCreateKnowledgeBase();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const { options: ownerOptions, isLoading: isOwnerChoiceLoading } =
    useResourceOwnership('knowledge-base');

  if (!isLoadingPermissions && !can('manage_knowledge_bases')) return null;

  return (
    <KnowledgeBaseCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      onCreate={createKnowledgeBase}
      buttonTestId="knowledge-base-create"
      ownerOptions={ownerOptions}
      isOwnerChoiceLoading={isOwnerChoiceLoading}
    />
  );
}
