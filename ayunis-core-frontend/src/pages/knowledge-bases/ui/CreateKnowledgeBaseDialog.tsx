import { useState } from 'react';
import { Form } from '@ayunis/ui/components/form';
import { useCreateKnowledgeBase } from '../api/useCreateKnowledgeBase';
import {
  CreateEntityDialog,
  useCreateDialogTranslations,
} from '@/widgets/create-entity-dialog';
import { NameField, ShortDescriptionField } from '@/widgets/entity-form-fields';
import { useMyPermissions } from '@/features/permissions';

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
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();

  // Hide the control from members without the manage-knowledge-bases permission
  // (rather than let them hit a 403 on submit). Wait for the permissions fetch
  // to resolve first, so the surrounding OnboardingTourTarget wrapper isn't left
  // empty on first visit before /permissions/me is cached.
  if (!isLoadingPermissions && !can('manage_knowledge_bases')) {
    return null;
  }

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
