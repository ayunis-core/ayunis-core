import { useTranslation } from 'react-i18next';
import { useMyPermissions } from '@/features/permissions';
import { useSkillMarketplaceUrl } from '@/features/marketplace';
import { SkillCreateDialog } from '@/widgets/resource-create-dialog';
import { useCreateSkill } from '@/pages/skills/api/useCreateSkill';

interface CreateSkillDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CreateSkillDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
  open,
  onOpenChange,
}: Readonly<CreateSkillDialogProps>) {
  const { t } = useTranslation('skills');
  const { createSkill } = useCreateSkill();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const marketplaceUrl = useSkillMarketplaceUrl();

  if (!isLoadingPermissions && !can('manage_own_skills')) return null;

  return (
    <SkillCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      footerHint={
        marketplaceUrl ? t('createDialog.marketplaceHint') : undefined
      }
      onCreate={createSkill}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
