import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useMyPermissions } from '@/features/permissions';

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
  const { t } = useTranslation('skills');
  const [isOpen, setIsOpen] = useState(false);
  const {
    form,
    onSubmit: originalOnSubmit,
    resetForm,
    isLoading,
  } = useCreateSkill();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();

  // Hide the control from members without the manage-skills permission (rather
  // than let them hit a 403 on submit). Wait for the permissions fetch to
  // resolve first, so the surrounding OnboardingTourTarget wrapper isn't left
  // empty on first visit before /permissions/me is cached.
  if (!isLoadingPermissions && !can('manage_skills')) {
    return null;
  }

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
      footerHint={t('createDialog.marketplaceHint')}
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
