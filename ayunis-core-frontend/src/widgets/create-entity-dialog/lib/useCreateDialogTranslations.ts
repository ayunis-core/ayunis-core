import { useTranslation } from 'react-i18next';

export function useCreateDialogTranslations(namespace: string) {
  const { t } = useTranslation(namespace);

  return {
    buttonText: t('createDialog.buttonText'),
    title: t('createDialog.title'),
    description: t('createDialog.description'),
    cancel: t('createDialog.buttons.cancel'),
    create: t('createDialog.buttons.create'),
    creating: t('createDialog.buttons.creating'),
  };
}
