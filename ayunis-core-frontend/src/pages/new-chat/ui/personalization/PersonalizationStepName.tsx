import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

interface PersonalizationStepNameProps {
  name: string;
  onNameChange: (name: string) => void;
}

export function PersonalizationStepName({
  name,
  onNameChange,
}: Readonly<PersonalizationStepNameProps>) {
  const { t } = useTranslation('chat');

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          {t('newChat.personalization.nameTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('newChat.personalization.nameDescription')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="personalization-name">
          {t('newChat.personalization.nameLabel')}
        </Label>
        <Input
          id="personalization-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('newChat.personalization.namePlaceholder')}
          maxLength={200}
          autoFocus
        />
      </div>
    </div>
  );
}
