import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Label } from '@ayunis/ui/components/label';
import { newDoorButton } from '@/pages/super-admin-settings/advent-calendar/lib/door-form-values';
import { DOOR_MAX_BUTTONS } from '@/pages/super-admin-settings/advent-calendar/model/constants';
import type {
  DoorButtonKind,
  DoorFormFields,
} from '@/pages/super-admin-settings/advent-calendar/model/types';
import DoorButtonFields from './DoorButtonFields';

const BUTTON_KINDS: DoorButtonKind[] = ['link', 'prompt', 'quiz'];

interface DoorButtonsFieldsProps {
  disabled: boolean;
}

export default function DoorButtonsFields({
  disabled,
}: Readonly<DoorButtonsFieldsProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const form = useFormContext<DoorFormFields>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'buttons',
  });
  const buttons = useWatch({ control: form.control, name: 'buttons' });
  const hasQuiz = buttons.some((button) => button.kind === 'quiz');
  const isFull = fields.length >= DOOR_MAX_BUTTONS;
  const rootError = form.formState.errors.buttons?.root?.message;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t('buttons.label')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('buttons.description')}
        </p>
      </div>
      {fields.map((field, index) => (
        <DoorButtonFields
          key={field.id}
          index={index}
          disabled={disabled}
          onRemove={() => remove(index)}
        />
      ))}
      {rootError && <p className="text-sm text-destructive">{rootError}</p>}
      <div className="flex flex-wrap gap-2">
        {BUTTON_KINDS.map((kind) => (
          <Button
            key={kind}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isFull || (kind === 'quiz' && hasQuiz)}
            onClick={() => append(newDoorButton(kind))}
            data-testid={`advent-calendar-door-add-${kind}`}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t(`buttons.add.${kind}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
