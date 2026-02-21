import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddPrompt } from '../api/useAddPrompt';
import { CreateItemDialogWidget } from '@/widgets/create-item-dialog/ui/CreateItemDialogWidget';
import type { CreatePromptFormValues } from '../model/createPromptSchema';

interface CreatePromptDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreatePromptDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
}: Readonly<CreatePromptDialogProps>) {
  const { t } = useTranslation('prompts');
  const [isOpen, setIsOpen] = useState(false);
  const { form, onSubmit, resetForm, isLoading } = useAddPrompt({
    onSuccessCallback: () => {
      setIsOpen(false);
      resetForm();
    },
  });

  const fields = [
    {
      name: 'title' as const,
      label: t('createDialog.form.titleLabel'),
      placeholder: t('createDialog.form.titlePlaceholder'),
      type: 'input' as const,
    },
    {
      name: 'content' as const,
      label: t('createDialog.form.contentLabel'),
      placeholder: t('createDialog.form.contentPlaceholder'),
      type: 'textarea' as const,
      textareaProps: { className: 'min-h-[300px] resize-none' },
    },
  ];

  return (
    <CreateItemDialogWidget<CreatePromptFormValues>
      buttonText={buttonText ?? t('createDialog.buttonText')}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      title={t('createDialog.title')}
      description={t('createDialog.description')}
      form={form}
      fields={fields}
      onSubmit={onSubmit}
      onCancel={resetForm}
      isLoading={isLoading}
      createButtonText={t('createDialog.buttons.create')}
      creatingButtonText={t('createDialog.buttons.creating')}
      cancelButtonText={t('createDialog.buttons.cancel')}
      open={isOpen}
      onOpenChange={setIsOpen}
    />
  );
}
