import {
  OwnerField,
  useOwnerSelection,
  useOwnershipCopy,
} from '@/features/resource-ownership';
import { KnowledgeBaseCreateDialog } from '@/widgets/resource-create-dialog';
import { useCreateKnowledgeBase } from '@/pages/knowledge-bases/api/useCreateKnowledgeBase';

interface CreateKnowledgeBaseDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
  buttonTestId?: string;
}

export default function CreateKnowledgeBaseDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
  buttonTestId,
}: Readonly<CreateKnowledgeBaseDialogProps>) {
  const { createKnowledgeBase } = useCreateKnowledgeBase();
  const owner = useOwnerSelection('knowledge_base');
  const copy = useOwnershipCopy('knowledge_base');

  if (!owner.isLoading && owner.options.length === 0) return null;

  const onlyOption = owner.options.length === 1 ? owner.options[0] : undefined;

  return (
    <KnowledgeBaseCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      buttonTestId={buttonTestId}
      description={
        onlyOption && onlyOption.type !== 'personal'
          ? copy.optionHint(onlyOption, owner.orgEditorsIncludeNonAdmins)
          : undefined
      }
      ownerField={
        owner.options.length > 1 && owner.selected ? (
          <OwnerField
            kind="knowledge_base"
            options={owner.options}
            value={owner.selected}
            orgEditorsIncludeNonAdmins={owner.orgEditorsIncludeNonAdmins}
            onChange={owner.select}
          />
        ) : undefined
      }
      onOpen={owner.reset}
      isSubmitDisabled={owner.isLoading || !owner.selected}
      onCreate={(data) =>
        createKnowledgeBase({ ...data, owner: owner.selected })
      }
    />
  );
}
