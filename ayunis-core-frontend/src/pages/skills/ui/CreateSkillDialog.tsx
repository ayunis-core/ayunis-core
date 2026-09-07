import { useTranslation } from 'react-i18next';
import { useMyPermissions } from '@/features/permissions';
import { SkillCreateDialog } from '@/widgets/resource-create-dialog';
import { useCreateSkill } from '@/pages/skills/api/useCreateSkill';

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
  const { t } = useTranslation('skills');
  const { createSkill } = useCreateSkill();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();

  if (!isLoadingPermissions && !can('manage_skills')) return null;

  return (
    <SkillCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      footerHint={t('createDialog.marketplaceHint')}
      onCreate={createSkill}
    />
  );
}
