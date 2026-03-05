import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { SkillTemplateResponseDto } from '@/shared/api';
import { useUpdateSkillTemplate } from '../api/useUpdateSkillTemplate';
import { SkillTemplateFormDialog } from './SkillTemplateFormDialog';
import type { SkillTemplateFormData } from './SkillTemplateFormDialog';

interface EditSkillTemplateDialogProps {
  template: SkillTemplateResponseDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSkillTemplateDialog({
  template,
  open,
  onOpenChange,
}: Readonly<EditSkillTemplateDialogProps>) {
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

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        shortDescription: template.shortDescription,
        instructions: template.instructions,
        distributionMode: template.distributionMode,
        defaultActive: template.defaultActive ?? false,
        defaultPinned: template.defaultPinned ?? false,
      });
    }
  }, [template, form]);

  const { updateSkillTemplate, isUpdating } = useUpdateSkillTemplate(() => {
    onOpenChange(false);
  });

  function handleSubmit(data: SkillTemplateFormData) {
    if (template) {
      void updateSkillTemplate(template.id, data).catch(() => {
        /* error already handled by mutation onError */
      });
    }
  }

  return (
    <SkillTemplateFormDialog
      title={t('form.editTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      submitLabel={t('form.submit')}
      submittingLabel={t('form.submitting')}
      hasContent={!!template}
    />
  );
}
