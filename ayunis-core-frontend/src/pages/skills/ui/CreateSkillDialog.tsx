import { useState } from 'react';
import { Form } from '@/shared/ui/shadcn/form';
import { type CreateSkillData, useCreateSkill } from '../api/useCreateSkill';
import {
  CreateEntityDialog,
  useCreateDialogTranslations,
} from '@/widgets/create-entity-dialog';
import {
  NameField,
  ShortDescriptionField,
  InstructionsField,
} from '@/widgets/entity-form-fields';

interface CreateSkillDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreateSkillDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
}: Readonly<CreateSkillDialogProps>) {
  const translations = useCreateDialogTranslations('skills');
  const [isOpen, setIsOpen] = useState(false);
  const {
    form,
    onSubmit: originalOnSubmit,
    resetForm,
    isLoading,
  } = useCreateSkill();

  const handleSubmit = (data: CreateSkillData) => {
    originalOnSubmit(data);
  };

  const handleCancel = () => {
    resetForm();
    setIsOpen(false);
  };

  return (
    <CreateEntityDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onCancel={handleCancel}
      onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
      isLoading={isLoading}
      translations={translations}
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
    >
      <Form {...form}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <NameField
              control={form.control}
              name="name"
              translationNamespace="skills"
            />
            <ShortDescriptionField
              control={form.control}
              name="shortDescription"
              translationNamespace="skills"
            />
          </div>
          <InstructionsField
            control={form.control}
            name="instructions"
            translationNamespace="skills"
          />
        </div>
      </Form>
    </CreateEntityDialog>
  );
}
