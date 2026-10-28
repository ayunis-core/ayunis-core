import { useMyPermissions } from '@/features/permissions';
import { KnowledgeBaseCreateDialog } from '@/widgets/resource-create-dialog';
import { useCreateKnowledgeBase } from '@/pages/knowledge-bases/api/useCreateKnowledgeBase';

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

  if (!isLoadingPermissions && !can('manage_knowledge_bases')) return null;

  return (
    <KnowledgeBaseCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      onCreate={createKnowledgeBase}
    />
  );
}
