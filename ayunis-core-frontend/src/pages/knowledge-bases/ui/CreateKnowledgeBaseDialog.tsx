import { useState } from 'react';
import { Form } from '@/shared/ui/shadcn/form';
import { useCreateKnowledgeBase } from '../api/useCreateKnowledgeBase';
import {
  CreateEntityDialog,
  useCreateDialogTranslations,
} from '@/widgets/create-entity-dialog';
import { NameField, ShortDescriptionField } from '@/widgets/entity-form-fields';

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
  const translations = useCreateDialogTranslations('knowledge-bases');
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => {
    resetForm();
    setIsOpen(false);
  };

  const { form, onSubmit, resetForm, isLoading } = useCreateKnowledgeBase({
    onClose: handleClose,
  });

  return (
    <CreateEntityDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onCancel={handleClose}
      onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
      isLoading={isLoading}
      translations={translations}
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
    >
      <Form {...form}>
        <div className="space-y-6">
          <NameField
            control={form.control}
            name="name"
            translationNamespace="knowledge-bases"
          />
          <ShortDescriptionField
            control={form.control}
            name="description"
            translationNamespace="knowledge-bases"
            multiline
          />
        </div>
      </Form>
    </CreateEntityDialog>
  );
}
