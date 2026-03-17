import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateSkillTemplate } from '../api/useCreateSkillTemplate';
import { SkillTemplateFormDialog } from './SkillTemplateFormDialog';
import type { SkillTemplateFormData } from './SkillTemplateFormDialog';

interface CreateSkillTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSkillTemplateDialog({
  open,
  onOpenChange,
}: Readonly<CreateSkillTemplateDialogProps>) {
  const { t } = useTranslation('super-admin-settings-skills');
  const form = useForm<SkillTemplateFormData>({
    defaultValues: {
      name: '',
      shortDescription: '',
      instructions: '',
      distributionMode: 'always_on',
      defaultActive: false,
      defaultPinned: false,
    },
  });

  const { createSkillTemplate, isCreating } = useCreateSkillTemplate(
    form,
    () => {
      onOpenChange(false);
      form.reset();
    },
  );

  return (
    <SkillTemplateFormDialog
      title={t('form.createTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={(data) => createSkillTemplate({ ...data, isActive: true })}
      isSubmitting={isCreating}
      submitLabel={t('form.create')}
      submittingLabel={t('form.creating')}
    />
  );
}
