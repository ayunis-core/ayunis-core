import { useState, type ReactNode } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { InfoHint } from '@/shared/ui/info-hint';
import { SkillImproveButton } from '@/widgets/skill-improve-button/ui/SkillImproveButton';

export interface SkillTextFields {
  name: string;
  shortDescription: string;
  instructions: string;
}

interface FieldAssist {
  isBusy: boolean;
  labelHint: ReactNode;
  labelAction: ReactNode;
}

export function useSkillTextAssist(
  form: UseFormReturn<SkillTextFields>,
  {
    labels,
    canImprove = true,
  }: {
    labels: { trigger: string; instructions: string };
    canImprove?: boolean;
  },
): { trigger: FieldAssist; instructions: FieldAssist; isBusy: boolean } {
  const { t } = useTranslation('skills');
  const [isTriggerBusy, setIsTriggerBusy] = useState(false);
  const [isInstructionsBusy, setIsInstructionsBusy] = useState(false);
  const [name, shortDescription, instructions] = useWatch({
    control: form.control,
    name: ['name', 'shortDescription', 'instructions'],
  });

  const improveButton = (
    field: 'trigger' | 'instructions',
    target: 'shortDescription' | 'instructions',
    onPendingChange: (isPending: boolean) => void,
  ) =>
    canImprove && (
      <SkillImproveButton
        field={field}
        name={name}
        trigger={shortDescription}
        instructions={instructions}
        onPendingChange={onPendingChange}
        onImproved={(text) =>
          form.setValue(target, text, { shouldDirty: true })
        }
      />
    );

  return {
    isBusy: isTriggerBusy || isInstructionsBusy,
    trigger: {
      isBusy: isTriggerBusy,
      labelHint: (
        <InfoHint
          label={labels.trigger}
          hint={t('fieldHints.trigger')}
          testId="skill-trigger-hint"
          showLabel={false}
        />
      ),
      labelAction: improveButton(
        'trigger',
        'shortDescription',
        setIsTriggerBusy,
      ),
    },
    instructions: {
      isBusy: isInstructionsBusy,
      labelHint: (
        <InfoHint
          label={labels.instructions}
          hint={t('fieldHints.instructions')}
          testId="skill-instructions-hint"
          showLabel={false}
        />
      ),
      labelAction: improveButton(
        'instructions',
        'instructions',
        setIsInstructionsBusy,
      ),
    },
  };
}
