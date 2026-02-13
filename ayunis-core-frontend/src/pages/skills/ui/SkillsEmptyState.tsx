import CreateSkillDialog from './CreateSkillDialog';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export default function SkillsEmptyState() {
  const { t } = useTranslation('skills');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <CreateSkillDialog
          buttonText={t('createDialog.buttonTextFirst')}
          showIcon={true}
        />
      }
    />
  );
}
