import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkillMarketplaceUrl } from '@/features/marketplace';
import {
  OwnerField,
  useOwnerSelection,
  useOwnershipCopy,
} from '@/features/resource-ownership';
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
  const marketplaceUrl = useSkillMarketplaceUrl();
  const owner = useOwnerSelection('skill');
  const copy = useOwnershipCopy('skill');
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) owner.reset();
  }

  if (!owner.isLoading && owner.options.length === 0) return null;

  const onlyOption = owner.options.length === 1 ? owner.options[0] : undefined;

  return (
    <SkillCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      footerHint={
        marketplaceUrl ? t('createDialog.marketplaceHint') : undefined
      }
      description={
        onlyOption && onlyOption.type !== 'personal'
          ? copy.optionHint(onlyOption, owner.orgEditorsIncludeNonAdmins)
          : undefined
      }
      ownerField={
        owner.options.length > 1 && owner.selected ? (
          <OwnerField
            kind="skill"
            options={owner.options}
            value={owner.selected}
            orgEditorsIncludeNonAdmins={owner.orgEditorsIncludeNonAdmins}
            onChange={owner.select}
          />
        ) : undefined
      }
      isSubmitDisabled={owner.isLoading || !owner.selected}
      onCreate={(data) => createSkill({ ...data, owner: owner.selected })}
      open={open}
      onOpenChange={(next) => {
        if (next) owner.reset();
        onOpenChange?.(next);
      }}
    />
  );
}
